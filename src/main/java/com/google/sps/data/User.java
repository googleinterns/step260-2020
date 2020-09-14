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

package com.google.sps.data;

import com.google.appengine.api.users.UserService;
import com.google.appengine.api.users.UserServiceFactory;

/** Class containing a user. */
public abstract class User {

  private final Boolean loggedIn;

  public User(Boolean loggedIn) {
    this.loggedIn = loggedIn;
  }

  public Boolean isLoggedIn() {
    return loggedIn;
  }

  public static User getCurrentUser() {
    User user;
    UserService userService = UserServiceFactory.getUserService();

    if (userService.isUserLoggedIn()) {
      // Load user variables.
      String userId = userService.getCurrentUser().getUserId();
      // Parameter specifies the url to redirect after logout.
      String logoutURL = userService.createLogoutURL("/");

      // Init user as a LoggedUser.
      user = new LoggedUser(userId, logoutURL);
    } else {
      // Parameter specifies the url to redirect after logout.
      String loginURL = userService.createLoginURL("/");

      // Init user as a NotLoggedUser.
      user = new NotLoggedUser(loginURL);
    }

    return user;
  }
}
