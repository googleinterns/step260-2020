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

// suppress linter error - functions are used in another file.
/* eslint no-unused-vars:
["error", { "varsIgnorePattern":
"showUserElements|" }] */

/** Function that shows user elements depending on their login status. */
async function showUserElements() {
  const currentUser = await getCurrentUser();

  // If the user is logged in show a History and a Logout button.
  if (currentUser.loggedIn) {
    document.getElementById('history-login').innerHTML =
        `<a href="/history.html">History</a> &nbsp;` +
        `<a href="${currentUser.logoutURL}">Logout</a>`;
  } else {
    // Else show a Login button.
    document.getElementById('history-login').innerHTML =
        `<a href="${currentUser.loginURL}">Login</a>`;
  }
}

/** Function that returns the current user. */
async function getCurrentUser() {
  const userResponse = await fetch('/user');
  return await userResponse.json();
}
