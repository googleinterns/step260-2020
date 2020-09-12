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
import com.google.appengine.api.datastore.FetchOptions;
import com.google.appengine.api.datastore.KeyFactory;
import com.google.appengine.api.datastore.PreparedQuery;
import com.google.appengine.api.datastore.Query;
import com.google.appengine.api.datastore.Query.CompositeFilter;
import com.google.appengine.api.datastore.Query.CompositeFilterOperator;
import com.google.appengine.api.datastore.Query.Filter;
import com.google.appengine.api.datastore.Query.FilterOperator;
import com.google.appengine.api.datastore.Query.FilterPredicate;
import com.google.appengine.api.datastore.Query.SortDirection;
import com.google.gson.Gson;
import com.google.sps.data.BlurImage;
import com.google.sps.data.LoggedUser;
import com.google.sps.data.User;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Date;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/photos")
public class PhotosServlet extends HttpServlet {

  /**
   * Method that handles the GET requests to "/photos" path. Parameter "max-photos" specifies the
   * maximum number of photos to return. Returns a JSON array of BlurImages ordered by dateCreated
   * descending.
   */
  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    // If the user is not logged in, send a redirect to the main page.
    User user = User.getCurrentUser();
    if (!user.isLoggedIn()) {
      response.sendRedirect("/");
      return;
    }
    LoggedUser loggedUser = (LoggedUser) user;

    // Get the input from the request.
    String maxPhotosString = request.getParameter("max-photos");

    // Convert the input to an int or Integer.MAX_VALUE.
    int maxPhotos;
    try {
      maxPhotos = Integer.parseInt(maxPhotosString);
    } catch (NumberFormatException e) {
      maxPhotos = Integer.MAX_VALUE;
    }

    // Make sure maxPhotos is not negative.
    if (maxPhotos < 0) {
      maxPhotos = 0;
    }

    // Load current user's photos from datastore.
    String userId = loggedUser.getId();
    Query query = new Query("BlurImage");
    query.setFilter(new Query.FilterPredicate("userId", Query.FilterOperator.EQUAL, userId));
    query.addSort("dateCreated", SortDirection.DESCENDING);
    DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
    PreparedQuery results = datastore.prepare(query);

    // Store photos in an array.
    ArrayList<BlurImage> photos = new ArrayList<>();
    for (Entity entity : results.asIterable(FetchOptions.Builder.withLimit(maxPhotos))) {
      long id = entity.getKey().getId();
      BlobKey blobKey = (BlobKey) entity.getProperty("blobKey");
      String jsonBlurRectangles = (String) entity.getProperty("jsonBlurRectangles");
      Date dateCreated = (Date) entity.getProperty("dateCreated");

      photos.add(new BlurImage(id, userId, blobKey, jsonBlurRectangles, dateCreated));
    }

    // Convert the photos array to JSON.
    Gson gson = new Gson();
    String json = gson.toJson(photos);

    // Send the JSON as the response.
    response.setCharacterEncoding("UTF-8");
    response.setContentType("application/json;");
    response.getWriter().println(json);
  }

  /**
   * Method to handle the DELETE requests to "/photos" path. Receives "photo-id" parameter. Deletes
   * a photo from the database.
   */
  @Override
  public void doDelete(HttpServletRequest request, HttpServletResponse response)
      throws IOException {
    // If the user is not logged in, send an error message.
    User user = User.getCurrentUser();
    if (!user.isLoggedIn()) {
      response.setContentType("text/html;");
      response.getWriter().println("You must be logged in to delete photos!");
      response.setStatus(HttpServletResponse.SC_FORBIDDEN);
      return;
    }
    LoggedUser loggedUser = (LoggedUser) user;

    // Get the input from the request.
    String idString = request.getParameter("photo-id");

    // Convert the input to a long or show error if the parameter is not a number.
    long id;
    try {
      id = Long.parseLong(idString);
    } catch (NumberFormatException e) {
      response.setContentType("text/html;");
      response.getWriter().println("Parameter photo-id must be a number. Received:" + idString);
      response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    // Get the photo entity from database.
    String userId = loggedUser.getId();
    Query query = new Query("BlurImage");
    Filter idFilter =
        new FilterPredicate(
            Entity.KEY_RESERVED_PROPERTY,
            FilterOperator.EQUAL,
            KeyFactory.createKey("BlurImage", id));
    // We also check the photo's userId to match to the user making the request to avoid deleting
    // other users' photos.
    Filter userIdFilter = new FilterPredicate("userId", FilterOperator.EQUAL, userId);
    // Combine the two filters into one.
    CompositeFilter combinedFilter = CompositeFilterOperator.and(idFilter, userIdFilter);
    // Apply the filter to the query.
    query.setFilter(combinedFilter);
    DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
    PreparedQuery results = datastore.prepare(query);
    Entity photoEntity = results.asSingleEntity();

    // If the entity does not exist, respond with an error.
    if (photoEntity == null) {
      response.setContentType("text/html;");
      response.getWriter().println("The current user has no photo with id: " + idString);
      response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    // Decrease user's usedSpace.
    BlobKey blobKey = (BlobKey) photoEntity.getProperty("blobKey");
    BlobInfo blobInfo = new BlobInfoFactory().loadBlobInfo(blobKey);
    long totalSpace = loggedUser.getUsedSpace() - blobInfo.getSize();
    loggedUser.setUsedSpace(totalSpace);

    // Delete image from blobstore.
    BlobstoreService blobstoreService = BlobstoreServiceFactory.getBlobstoreService();
    blobstoreService.delete(blobKey);

    // Delete image from database.
    datastore.delete(photoEntity.getKey());
  }
}
