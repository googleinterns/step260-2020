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
import java.util.Date;

/** Class containing an image and the rectangles detected by the Cloud Vision API. */
public final class BlurImage {

  private final long id;
  private final String userId;
  private final String blobKeyString;
  private final String jsonBlurRectangles;
  private final Date dateCreated;
  private final int sizeInKB;

  public BlurImage(
      long id, String userId, BlobKey blobKey, String jsonBlurRectangles, Date dateCreated) {
    this.id = id;
    this.userId = userId;
    this.blobKeyString = blobKey.getKeyString();
    this.jsonBlurRectangles = jsonBlurRectangles;
    this.dateCreated = dateCreated;

    BlobInfo blobInfo = new BlobInfoFactory().loadBlobInfo(blobKey);
    // getSize() function returns the size in bytes. We divide by 1024 to
    // convert it in KB. We can cast it to int because it can't be bigger than
    // 8192.
    sizeInKB = (int) (blobInfo.getSize() / 1024);
  }

  public long getId() {
    return id;
  }

  public String getUserId() {
    return userId;
  }

  public String getBlobKey() {
    return blobKeyString;
  }

  public String getJsonBlurRectangles() {
    return jsonBlurRectangles;
  }

  public Date dateCreated() {
    return dateCreated;
  }

  public int getSizeInKB() {
    return sizeInKB;
  }
}
