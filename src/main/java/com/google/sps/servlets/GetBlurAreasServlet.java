// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package com.google.sps.servlets;

import com.google.appengine.api.blobstore.BlobInfo;
import com.google.appengine.api.blobstore.BlobInfoFactory;
import com.google.appengine.api.blobstore.BlobKey;
import com.google.appengine.api.blobstore.BlobstoreService;
import com.google.appengine.api.blobstore.BlobstoreServiceFactory;
import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.DatastoreServiceFactory;
import com.google.appengine.api.datastore.Entity;
import com.google.cloud.vision.v1.AnnotateImageRequest;
import com.google.cloud.vision.v1.AnnotateImageRequest.Builder;
import com.google.cloud.vision.v1.AnnotateImageResponse;
import com.google.cloud.vision.v1.BatchAnnotateImagesResponse;
import com.google.cloud.vision.v1.BoundingPoly;
import com.google.cloud.vision.v1.EntityAnnotation;
import com.google.cloud.vision.v1.FaceAnnotation;
import com.google.cloud.vision.v1.Feature;
import com.google.cloud.vision.v1.Image;
import com.google.cloud.vision.v1.ImageAnnotatorClient;
import com.google.cloud.vision.v1.LocalizedObjectAnnotation;
import com.google.cloud.vision.v1.NormalizedVertex;
import com.google.cloud.vision.v1.Vertex;
import com.google.gson.Gson;
import com.google.protobuf.ByteString;
import com.google.sps.data.LoggedUser;
import com.google.sps.data.User;
import java.awt.Point;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Map;
import javax.imageio.ImageIO;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/get-blur-areas")
public class GetBlurAreasServlet extends HttpServlet {

  // Image types that are supported by our application.
  private static final ArrayList<String> supportedTypes =
      new ArrayList<>(Arrays.asList("image/jpeg", "image/png"));

  // Bitmask for the features we can blur.
  private static final Integer FACE_BLUR_MASK = 1 << 0;
  private static final Integer PLATE_BLUR_MASK = 1 << 1;
  private static final Integer LOGO_BLUR_MASK = 1 << 2;

  /**
   * This method handles the POST requests to "/get-blur-areas". Receives a BlobKey parameter which
   * represents the Blobstore location of an image. Responds with a JSON ArrayList of rectangles. A
   * rectangle is represented by a List of points. A point contains two properties, its coordinates:
   * x and y.
   */
  @Override
  public void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    // Get the BlobKey that points to the image uploaded by the user.
    BlobKey blobKey = getBlobKey(request, "image");

    // User didn't upload a file, so render an error message.
    if (blobKey == null) {
      response.setContentType("text/html;");
      response.getWriter().println("Please upload an image file.");
      response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    // Check if uploaded file type is supported.
    BlobInfo blobInfo = new BlobInfoFactory().loadBlobInfo(blobKey);
    String fileType = blobInfo.getContentType();
    if (!supportedTypes.contains(fileType)) {
      deleteFile(blobKey);

      response.setContentType("text/html;");
      response.getWriter().println("Image type <" + fileType + "> not supported.");
      response.getWriter().println("Types supported: " + supportedTypes.toString());
      response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    // We need this to convert Java objects to JSON strings.
    Gson gson = new Gson();

    // Get the image the user uploaded as bytes.
    byte[] imageBytes = getBlobBytes(blobKey);

    // Create a bitmask representing which parts of the image to blur in getBlurAreas method.
    // Example: FACE_BLUR_MASK | LOGO_BLUR_MASK = 101 means to blur faces, logos but not plates.
    Integer partsToBlurMask = 0;

    String faceBlur = request.getParameter("face-blur");
    String plateBlur = request.getParameter("plate-blur");
    String logoBlur = request.getParameter("logo-blur");

    // If the user checked a part to blur, add it to our bitmask.
    if (faceBlur != null && faceBlur.equals("on")) {
      partsToBlurMask |= FACE_BLUR_MASK;
    }
    if (plateBlur != null && plateBlur.equals("on")) {
      partsToBlurMask |= PLATE_BLUR_MASK;
    }
    if (logoBlur != null && logoBlur.equals("on")) {
      partsToBlurMask |= LOGO_BLUR_MASK;
    }

    ArrayList<List<Point>> blurAreas;
    // If the user selected at least one part to blur, call getBlurAreas. Else respond with an
    // empty list.
    if (partsToBlurMask != 0) {
      blurAreas = getBlurAreas(imageBytes, partsToBlurMask);
    } else {
      blurAreas = new ArrayList<List<Point>>();
    }

    // If the user is logged in, we will save the photo in our database.
    User user = User.getCurrentUser();
    if (user.isLoggedIn()) {
      LoggedUser loggedUser = (LoggedUser) user;

      // Total storage space used by the user, including the new uploaded photo.
      long totalSpace = loggedUser.getUsedSpace() + blobInfo.getSize();

      // If the total space doesn't exceed the limit, store the photo in database. If it exceeds, we
      // simply ignore it for now.
      if (totalSpace <= LoggedUser.USER_STORAGE_LIMIT) {
        // Create the imageEntity.
        Entity imageEntity = new Entity("BlurImage");
        imageEntity.setProperty("userId", loggedUser.getId());
        imageEntity.setProperty("blobKey", blobKey);
        imageEntity.setProperty("jsonBlurRectangles", gson.toJson(blurAreas));
        // new Date() returns the current date object.
        imageEntity.setProperty("dateCreated", new Date());

        // Save imageEntity in datastore.
        DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
        datastore.put(imageEntity);

        loggedUser.setUsedSpace(totalSpace);
      }
    }
    // If the user is not logged in, we delete the photo.
    else {
      deleteFile(blobKey);
    }

    // Convert the rectangles to JSON.
    String jsonResponse = gson.toJson(blurAreas);

    // Send the JSON back as the response.
    response.setContentType("application/json");
    response.getWriter().println(jsonResponse);
  }

  /**
   * Uses the Google Cloud Vision API to find parts to blur in the image represented by the binary
   * data stored in @param imageBytes
   *
   * @return an ArrayList of bounding rectangles representing parts to blur. Rectangles are
   *     represented by a list of points. There is no guaranteed order of the points.
   */
  private ArrayList<List<Point>> getBlurAreas(byte[] imageBytes, Integer partsToBlurMask)
      throws IOException {
    // This is the array that we will return.
    ArrayList<List<Point>> rectanglesToBlur = new ArrayList<>();

    // Convert bytes to an Image object.
    ByteString byteString = ByteString.copyFrom(imageBytes);
    Image image = Image.newBuilder().setContent(byteString).build();

    // This will hold the image and the features we want to detect.
    Builder requestBuilder = AnnotateImageRequest.newBuilder();

    // Check which parts our bitmask contains and add the corresponding features to requestBuilder.
    // setMaxResults(0) disables the maximum limit of features to return.
    if ((partsToBlurMask & FACE_BLUR_MASK) != 0) {
      Feature feature =
          Feature.newBuilder().setType(Feature.Type.FACE_DETECTION).setMaxResults(0).build();
      requestBuilder.addFeatures(feature);
    }
    if ((partsToBlurMask & PLATE_BLUR_MASK) != 0) {
      Feature feature =
          Feature.newBuilder().setType(Feature.Type.OBJECT_LOCALIZATION).setMaxResults(0).build();
      requestBuilder.addFeatures(feature);
    }
    if ((partsToBlurMask & LOGO_BLUR_MASK) != 0) {
      Feature feature =
          Feature.newBuilder().setType(Feature.Type.LOGO_DETECTION).setMaxResults(0).build();
      requestBuilder.addFeatures(feature);
    }

    requestBuilder.setImage(image);

    // Create an array of requests containing only ours to pass to the batchAnnotateImages function.
    List<AnnotateImageRequest> requests = new ArrayList<>();
    requests.add(requestBuilder.build());

    // Annotate the image from our request. Skip if there is any internal error in the API.
    try (ImageAnnotatorClient client = ImageAnnotatorClient.create()) {
      BatchAnnotateImagesResponse response = client.batchAnnotateImages(requests);
      List<AnnotateImageResponse> responses = response.getResponsesList();

      // We need this to get the width and height of the image.
      BufferedImage bufferedImage = ImageIO.read(new ByteArrayInputStream(imageBytes));

      for (AnnotateImageResponse res : responses) {
        // If there was any internal error in the Cloud Vision API, skip this response.
        if (res.hasError()) {
          System.out.println(res.getError());
          continue;
        }

        // For each face detected add a rectangle represented by an array of points.
        for (FaceAnnotation face : res.getFaceAnnotationsList()) {
          rectanglesToBlur.add(getPoints(face.getFdBoundingPoly()));
        }

        // For each object detected add a rectangle represented by an array of points if it is a
        // license plate.
        for (LocalizedObjectAnnotation object : res.getLocalizedObjectAnnotationsList()) {
          if (object.getName().equals("License plate")) {
            ArrayList<Point> points = new ArrayList<>();
            for (NormalizedVertex vertex : object.getBoundingPoly().getNormalizedVerticesList()) {
              // Localized object bounding polys contain normalized vertices with coordinates in
              // [0, 1] so we have to denormalize them.
              Integer x = Math.round(vertex.getX() * bufferedImage.getWidth());
              Integer y = Math.round(vertex.getY() * bufferedImage.getHeight());
              points.add(new Point(x, y));
            }
            rectanglesToBlur.add(points);
          }
        }

        // For each logo detected add a rectangle represented by an array of points.
        for (EntityAnnotation logo : res.getLogoAnnotationsList()) {
          rectanglesToBlur.add(getPoints(logo.getBoundingPoly()));
        }
      }

      client.close();
    }

    return rectanglesToBlur;
  }

  /**
   * Returns the BlobKey that points to the file uploaded by the user, or null if the user didn't
   * upload a file.
   */
  private BlobKey getBlobKey(HttpServletRequest request, String formInputElementName) {
    BlobstoreService blobstoreService = BlobstoreServiceFactory.getBlobstoreService();
    Map<String, List<BlobKey>> blobs = blobstoreService.getUploads(request);
    List<BlobKey> blobKeys = blobs.get(formInputElementName);

    // User submitted form without selecting a file, so we can't get a BlobKey. (dev server)
    if (blobKeys == null || blobKeys.isEmpty()) {
      return null;
    }

    // Our form only contains a single file input, so get the first index.
    BlobKey blobKey = blobKeys.get(0);

    // User submitted form without selecting a file, so the BlobKey is empty. (live server)
    BlobInfo blobInfo = new BlobInfoFactory().loadBlobInfo(blobKey);
    if (blobInfo.getSize() == 0) {
      blobstoreService.delete(blobKey);
      return null;
    }

    return blobKey;
  }

  /**
   * Blobstore stores files as binary data. This function retrieves the image represented by the
   * binary data stored at the BlobKey parameter.
   */
  private byte[] getBlobBytes(BlobKey blobKey) throws IOException {
    BlobstoreService blobstoreService = BlobstoreServiceFactory.getBlobstoreService();
    ByteArrayOutputStream outputBytes = new ByteArrayOutputStream();

    int fetchSize = BlobstoreService.MAX_BLOB_FETCH_SIZE;
    long currentByteIndex = 0;
    byte[] b;
    do {
      // End index is inclusive, so we have to subtract 1 to get fetchSize bytes.
      b = blobstoreService.fetchData(blobKey, currentByteIndex, currentByteIndex + fetchSize - 1);
      outputBytes.write(b);

      currentByteIndex += fetchSize;
    }
    // If we read fewer bytes than we requested, then we reached the end.
    while (b.length == fetchSize);

    return outputBytes.toByteArray();
  }

  private Boolean isImageSupported(BlobKey blobKey) {
    BlobInfo blobInfo = new BlobInfoFactory().loadBlobInfo(blobKey);
    return supportedTypes.contains(blobInfo.getContentType());
  }

  private String getFileType(BlobKey blobKey) {
    BlobInfo blobInfo = new BlobInfoFactory().loadBlobInfo(blobKey);
    return blobInfo.getContentType();
  }

  /** Deletes a file from the blobstore */
  private void deleteFile(BlobKey blobKey) {
    BlobstoreService blobstoreService = BlobstoreServiceFactory.getBlobstoreService();
    blobstoreService.delete(blobKey);
  }

  /** Returns an ArrayList containing a BoundingPoly's points. */
  private ArrayList<Point> getPoints(BoundingPoly poly) {
    ArrayList<Point> points = new ArrayList<>();
    for (Vertex vertex : poly.getVerticesList())
      points.add(new Point(vertex.getX(), vertex.getY()));
    return points;
  }
}
