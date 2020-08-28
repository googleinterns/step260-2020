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

import com.google.appengine.api.blobstore.BlobstoreService;
import com.google.appengine.api.blobstore.BlobstoreServiceFactory;
import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/blobstore-upload-url")
public class BlobstoreUploadUrlServlet extends HttpServlet {

  /**
   * Expects forwardurl parameter: the url to redirect after the user uploaded a file. Responds with
   * an URL that uploads a file to blobstore and redirects to forwardurl.
   */
  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    String forwardUrl = request.getParameter("forwardurl");

    // If forwardurl is not provided, throw an error.
    if (forwardUrl == null) {
      response.setContentType("text/html;");
      response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
      response.getWriter().println("ERROR: forwardurl parameter not provided!");
      return;
    }

    BlobstoreService blobstoreService = BlobstoreServiceFactory.getBlobstoreService();
    String uploadUrl;

    // Exception is thrown if forwardurl is invalid.
    try {
      uploadUrl = blobstoreService.createUploadUrl(forwardUrl);
    } catch (IllegalArgumentException e) {
      response.setContentType("text/html;");
      response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
      response.getWriter().println("ERROR: forwardurl parameter is invalid!");
      return;
    }

    response.setContentType("text/html");
    response.getWriter().println(uploadUrl);
  }
}
