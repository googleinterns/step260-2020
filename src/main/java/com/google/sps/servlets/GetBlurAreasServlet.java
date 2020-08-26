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
import com.google.cloud.vision.v1.AnnotateImageRequest;
import com.google.cloud.vision.v1.AnnotateImageResponse;
import com.google.cloud.vision.v1.BatchAnnotateImagesResponse;
import com.google.cloud.vision.v1.FaceAnnotation;
import com.google.cloud.vision.v1.Feature;
import com.google.cloud.vision.v1.Image;
import com.google.cloud.vision.v1.ImageAnnotatorClient;
import com.google.cloud.vision.v1.Vertex;
import com.google.gson.Gson;
import com.google.protobuf.ByteString;
import java.awt.Point;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/get-blur-areas")
public class GetBlurAreasServlet extends HttpServlet {

  // Image types that are supported by our application.
  private static final ArrayList<String> supportedTypes =
      new ArrayList<>(Arrays.asList("image/jpeg", "image/png"));

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

    // Get the image the user uploaded as bytes.
    byte[] imageBytes = getBlobBytes(blobKey);

    ArrayList<List<Point>> blurAreas = getBlurAreas(imageBytes);
    deleteFile(blobKey);

    // Convert the rectangles to JSON.
    Gson gson = new Gson();
    String jsonResponse = gson.toJson(blurAreas);

    // Send the JSON back as the response.
    response.setContentType("application/json");
    response.getWriter().println(jsonResponse);
  }

  /**
   * Uses the Google Cloud Vision API to find faces in the image represented by the binary data
   * stored in @param imageBytes
   *
   * @return an ArrayList of bounding rectangles representing faces. Rectangles are represented by a
   *     list of points. There is no guaranteed order of the points.
   */
  private ArrayList<List<Point>> getBlurAreas(byte[] imageBytes) throws IOException {
    // This is the array that we will return.
    ArrayList<List<Point>> faceBorders = new ArrayList<>();

    // Convert bytes to an Image object.
    ByteString byteString = ByteString.copyFrom(imageBytes);
    Image image = Image.newBuilder().setContent(byteString).build();

    // Create a face detection request to our image.
    Feature feature = Feature.newBuilder().setType(Feature.Type.FACE_DETECTION).build();
    AnnotateImageRequest request =
        AnnotateImageRequest.newBuilder().addFeatures(feature).setImage(image).build();

    // Create an array of requests containing only ours to pass to the batchAnnotateImages function.
    List<AnnotateImageRequest> requests = new ArrayList<>();
    requests.add(request);

    // Annotate the image from our request. Skip if there is any internal error in the API.
    try (ImageAnnotatorClient client = ImageAnnotatorClient.create()) {
      BatchAnnotateImagesResponse response = client.batchAnnotateImages(requests);
      List<AnnotateImageResponse> responses = response.getResponsesList();

      for (AnnotateImageResponse res : responses) {
        // If there was any internal error in the Cloud Vision API, skip this response
        if (res.hasError()) {
          System.out.println(res.getError());
          continue;
        }

        // For each face detected create a rectangle represented by an array of points.
        for (FaceAnnotation face : res.getFaceAnnotationsList()) {
          ArrayList<Point> facePoly = new ArrayList<>();
          for (Vertex vertex : face.getFdBoundingPoly().getVerticesList())
            facePoly.add(new Point(vertex.getX(), vertex.getY()));

          // Add the rectangle to our list of face rectangles.
          faceBorders.add(facePoly);
        }
      }

      client.close();
    }

    return faceBorders;
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
}
