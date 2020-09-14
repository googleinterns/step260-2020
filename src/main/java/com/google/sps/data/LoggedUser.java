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

/** Class containing a logged user. */
public final class LoggedUser extends User {

  // How much space in bytes can a user use to store photos.
  public static final long USER_STORAGE_LIMIT = 50 * 1024 * 1024;

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

  /** Returns the datastore BlurImage entities corresponding to the user ordered by dateCreated. */
  public Iterable<Entity> getBlurImageEntities(int maxResults) {
    if (maxResults < 0) {
      maxResults = 0;
    }

    // Load user's photos from datastore.
    Query query = new Query("BlurImage");
    query.setFilter(new Query.FilterPredicate("userId", Query.FilterOperator.EQUAL, id));
    query.addSort("dateCreated", SortDirection.DESCENDING);
    DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
    PreparedQuery results = datastore.prepare(query);

    // Convert the results to an Iterable of maximum maxResults elements.
    return results.asIterable(FetchOptions.Builder.withLimit(maxResults));
  }

  /**
   * Deletes the photo with photoid from datastore if it belongs to the current user. Returns true
   * if a photo was deleted and false otherwise.
   */
  public boolean deletePhoto(long photoId) {
    // Get the photo entity from database.
    Query query = new Query("BlurImage");
    Filter photoIdFilter =
        new FilterPredicate(
            Entity.KEY_RESERVED_PROPERTY,
            FilterOperator.EQUAL,
            KeyFactory.createKey("BlurImage", photoId));
    // We check the photo's userId to match the current user.
    Filter userIdFilter = new FilterPredicate("userId", FilterOperator.EQUAL, id);
    // Combine the two filters into one.
    CompositeFilter combinedFilter = CompositeFilterOperator.and(photoIdFilter, userIdFilter);
    // Apply the filter to the query.
    query.setFilter(combinedFilter);
    DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
    PreparedQuery results = datastore.prepare(query);
    Entity photoEntity = results.asSingleEntity();

    // If the entity does not exist then the user has no photo with id photoId.
    if (photoEntity == null) {
      return false;
    }

    // Decrease user's usedSpace.
    BlobKey blobKey = (BlobKey) photoEntity.getProperty("blobKey");
    BlobInfo blobInfo = new BlobInfoFactory().loadBlobInfo(blobKey);
    setUsedSpace(usedSpace - blobInfo.getSize());

    // Delete image from blobstore.
    BlobstoreService blobstoreService = BlobstoreServiceFactory.getBlobstoreService();
    blobstoreService.delete(blobKey);

    // Delete image from database.
    datastore.delete(photoEntity.getKey());

    // The image was deleted successfully.
    return true;
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
    if (usedSpace < 0) {
      usedSpace = 0l;
    }
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
