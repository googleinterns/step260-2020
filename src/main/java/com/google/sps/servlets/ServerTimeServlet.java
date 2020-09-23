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

import com.google.gson.Gson;
import java.io.IOException;
import java.util.Date;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/** Servlet that returns current server's time. */
@WebServlet("/server-time")
public class ServerTimeServlet extends HttpServlet {

  /**
   * Method that handles the GET requests to "/server-time" path. Returns a Date object, meaning
   * the current server time.
   */
  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    // Convert the current date to JSON.
    Gson gson = new Gson();
    String jsonResponse = gson.toJson(new Date());

    // Send the JSON back as the response.
    response.setContentType("application/json");
    response.getWriter().println(jsonResponse);
  }
}