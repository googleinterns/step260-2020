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
import com.google.appengine.api.blobstore.BlobstoreService;
import com.google.appengine.api.blobstore.BlobstoreServiceFactory;
import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/photo")
public class PhotoServlet extends HttpServlet {

  /**
   * Method that handles the GET requests to "/photo" path. Parameter "blob-key" specifies the
   * blobKey of the photo requested. Responds with the photo at the blobstore location pointed by
   * "blob-key".
   */
  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    String blobKeyString = request.getParameter("blob-key");

    if (blobKeyString == null) {
      response.setContentType("text/html;");
      response.getWriter().println("Please provide the blob-key parameter.");
      response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    BlobstoreService blobstoreService = BlobstoreServiceFactory.getBlobstoreService();
    BlobKey blobKey = new BlobKey(blobKeyString);
    blobstoreService.serve(blobKey, response);
  }
}
