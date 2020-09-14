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

import com.google.appengine.api.blobstore.BlobKey;
import com.google.appengine.api.datastore.Entity;
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

    // Load current user's photos from datastore ordered by date created.
    Iterable<Entity> photoEntities = loggedUser.getBlurImageEntities(maxPhotos);

    // Store photos in an array.
    ArrayList<BlurImage> photos = new ArrayList<>();
    String userId = loggedUser.getId();
    for (Entity entity : photoEntities) {
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

    // Delete the photo.
    if (!loggedUser.deletePhoto(id)) {
      // If the user doesn't have a photo with id, show a message.
      response.setContentType("text/html;");
      response.getWriter().println("The current user has no photo with id: " + idString);
      response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
    }
  }
}
