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

import com.google.appengine.api.blobstore.BlobKey;
import com.google.appengine.api.images.ImagesService;
import com.google.appengine.api.images.ImagesServiceFactory;
import com.google.appengine.api.images.ServingUrlOptions;
import java.awt.Point;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Date;
import java.util.List;

/** Class containing an image and the rectangles detected by the Cloud Vision API. */
public final class BlurImage {

  private final long id;
  private final String userId;
  private final String url;
  private final List<List<Point>> blurRectangles;
  private final Date dateAccessed;

  public BlurImage(
      long id,
      String userId,
      BlobKey blobKey,
      List<List<Point>> blurRectangles,
      Date dateAccessed) {
    this.id = id;
    this.userId = userId;
    this.url = getFileUrl(blobKey);
    this.blurRectangles = blurRectangles;
    this.dateAccessed = dateAccessed;
  }

  /** Returns a URL that points to the blobstore file at the blobKey location. */
  private String getFileUrl(BlobKey blobKey) {
    // Use ImagesService to get a URL that points to the uploaded file.
    ImagesService imagesService = ImagesServiceFactory.getImagesService();
    ServingUrlOptions options = ServingUrlOptions.Builder.withBlobKey(blobKey);

    // To support running in Google Cloud Shell with AppEngine's devserver, we must use the relative
    // path to the image, rather than the path returned by imagesService which contains a host.
    try {
      URL url = new URL(imagesService.getServingUrl(options));
      return url.getPath();
    } catch (MalformedURLException e) {
      return imagesService.getServingUrl(options);
    }
  }

  public long getId() {
    return id;
  }

  public String getUserId() {
    return userId;
  }

  public String getUrl() {
    return url;
  }

  public List<List<Point>> getBlurRectangles() {
    return blurRectangles;
  }

  public Date getDateAccessed() {
    return dateAccessed;
  }
}
