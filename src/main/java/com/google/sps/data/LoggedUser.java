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

import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.DatastoreServiceFactory;
import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.PreparedQuery;
import com.google.appengine.api.datastore.Query;

/** Class containing a logged user. */
public final class LoggedUser extends User {

  private final String id;
  private Long usedSpace;
  private final String logoutURL;

  public LoggedUser(String id, String logoutURL) {
    // Init User super class with loggedIn = true.
    super(true);

    this.id = id;
    this.logoutURL = logoutURL;

    // Get user's usedSpace from the database.
    this.usedSpace = (long) getEntity().getProperty("usedSpace");
  }

  public String getId() {
    return id;
  }

  public Long getUsedSpace() {
    return usedSpace;
  }

  public String getLogoutURL() {
    return logoutURL;
  }

  public void setUsedSpace(Long usedSpace) {
    this.usedSpace = usedSpace;

    // Update user's usedSpace in the database.
    Entity entity = getEntity();
    entity.setProperty("usedSpace", usedSpace);
    DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
    datastore.put(entity);
  }

  private Entity getEntity() {
    // Get the user's entity from database.
    DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
    Query query = new Query("User");
    query.setFilter(new Query.FilterPredicate("id", Query.FilterOperator.EQUAL, id));
    PreparedQuery results = datastore.prepare(query);
    Entity userEntity = results.asSingleEntity();

    // If the user is not in database yet, add them.
    if (userEntity == null) {
      userEntity = new Entity("User");
      userEntity.setProperty("id", id);
      userEntity.setProperty("usedSpace", 0l);
      datastore.put(userEntity);
    }

    return userEntity;
  }
}
