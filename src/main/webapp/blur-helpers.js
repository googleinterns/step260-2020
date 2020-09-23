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
"getImageFromUrl|getDefaultBlurRadius|preloadPhotos|" }] */

/**
 * Function to create canvas with width and height
 * of an image.
 * @param {Image} image
 * @return {HTMLCanvasElement}
 */
function createCanvasForImage(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;

  return canvas;
}

/**
 * Function to create canvas with width and height
 * of an image.
 * @param {Image} image
 * @return {HTMLCanvasElement}
 */
function createCanvasForImage(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;

  return canvas;
}

/**
 * Helper function to get average rect size of
 * rects to blur.
 * @param {Array<Rect>} rects
 * @return {Number} average rect size.
 */
function getAverageRectsArea(rects) {
  let totalArea = 0;

  for (const rect of rects) {
    totalArea += rect.width * rect.height;
  }

  return totalArea / rects.length;
}

/**
 * Helper function to get image object from url
 * pointing to that image.
 * @param {String} url
 * @return {Promise<Image>}
 */
function getImageFromUrl(url) {
  return new Promise(function(resolve) {
    const image = new Image();
    image.src = url;

    image.onload = function() {
      resolve(image);
    };
  });
}

/**
 * Helper function to get the default blurRadius for blurAreas.
 * @param {Array<Rect>} blurAreas
 * @return {Number} default blur Radius.
 */
function getDefaultBlurRadius(blurAreas) {
  const SAMPLE_AREA_SIZE = 100 * 100;
  const SAMPLE_BEST_BLUR_RADIUS = 12;

  return Math.ceil(getAverageRectsArea(blurAreas) /
      SAMPLE_AREA_SIZE * SAMPLE_BEST_BLUR_RADIUS);
}

/**
 * Function to draw image on canvas.
 * Width of canvas should be constant, height adjusts for
 * the image proportions.
 * @param {Image} image
 * @param {HTMLCanvasElement} canvas
 */
function drawImageOnCanvas(image, canvas) {
  const ctx = canvas.getContext('2d');

  // clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // resize canvas height to fit new image
  canvas.height = image.height * canvas.width / image.width;

  // draw new image on it, scaling the image to fit in canvas
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
}

/**
 * Constructor for rectangle to blur.
 * Takes as parameter rectangle from server - array with 4 points,
 * point is an object with properties 'x' and 'y'.
 * Validates rectangle from server.
 * @param {Array<Object>} rect
 * @param {Image} image
 * @constructor
 */
function Rect(rect, image) {
  this.toBeBlurred = true;

  if (!Array.isArray(rect)) {
    throw new Error('Object passed here is not an Array. ' +
        'It must be an Array of points');
  }

  // has 4 points
  if (rect.length !== 4) {
    throw new Error(`Rectangle object must contain exactly 4 corner ` +
        `points. This object has ${rect.length} points.`);
  }

  // points must have x and y properties
  for (const point of rect) {
    if (!point.hasOwnProperty('x')) {
      throw new Error(`Point ${JSON.stringify(point)} ` +
      `does not have "x" property`);
    }
    if (!point.hasOwnProperty('y')) {
      throw new Error(`Point ${JSON.stringify(point)} ` +
          `does not have "y" property`);
    }
  }

  // points must not duplicate
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < i; j++) {
      if (rect[i].x === rect[j].x && rect[i].y === rect[j].y) {
        throw new Error(`Duplicate points : point ${i} = ` +
            `point ${j} = (${rect[i].x}, ${rect[i].y})`);
      }
    }
  }

  // get leftX, rightX, topY and bottomY
  // as min or max values
  this.leftX = rect[0].x;
  this.topY = rect[0].y;
  let rightX = rect[0].x;
  let bottomY = rect[0].y;

  for (const point of rect) {
    this.leftX = Math.min(this.leftX, point.x);
    this.topY = Math.min(this.topY, point.y);
    rightX = Math.max(rightX, point.x);
    bottomY = Math.max(bottomY, point.y);
  }

  this.height = bottomY - this.topY + 1;
  this.width = rightX - this.leftX + 1;

  // all point's x and y must equal minimum or maximum of those values.
  // if points do not duplicate, it's 'x' has 2 options - either leftX
  // or rightX, 'y' has 2 options, and rect object has exactly 4 points,
  // then we are sure, that this is a rectangle, parallel to x and y axes.
  for (const point of rect) {
    if (point.x !== this.leftX && point.x !== rightX) {
      throw new Error(`Point's (${point.x}, ${point.y}) "x" property equals ` +
          `${point.x} which does not equal this rect's ` +
          `minimum (${this.leftX}) or maximum (${rightX}) "x" property => ` +
          `this is not a rectangle with sides parallel to x and y axes`);
    }
    if (point.y !== this.topY && point.y !== bottomY) {
      throw new Error(`Point's (${point.x}, ${point.y}) "y" property equals ` +
          `${point.y} which does not equal this rect's ` +
          `minimum (${this.topY}) or maximum (${bottomY}) "y" property => ` +
          `this is not a rectangle with sides parallel to x and y axes`);
    }
  }

  // rect must not have points outside the image
  if (this.leftX < 0) {
    throw new Error(`Has negative x point: ${this.leftX}`);
  }
  if (this.topY < 0) {
    throw new Error(`Has negative y point: ${this.topY}`);
  }
  if (rightX > image.width) {
    throw new Error(`Has x point (x=${rightX}) which is greater than ` +
        `image width`);
  }
  if (bottomY > image.height) {
    throw new Error(`Has y point (y=${bottomY}) which is greater than ` +
        `image height`);
  }
}

/**
 * Constructor for image object.
 * @param {String} imageUrl
 * @param {Image|HTMLCanvasElement} imageObject
 * @param {String} imageFileName
 * @param {String} imageType
 * @param {Array<Rect>} blurAreas
 * @constructor
 */
function ImageObject(imageUrl, imageObject, imageFileName,
    imageType, blurAreas) {
  this.url = imageUrl;
  this.object = imageObject;
  this.fileName = imageFileName;
  this.type = imageType;
  this.blurAreas = blurAreas;
}

/**
 * If the photo is in sessionStorage, returns it from there.
 * Else loads it from the server and blurs it.
 * @param {Photo} photo JSON object returned by '/photos' GET request.
 * @return {Image}
 */
async function loadBlurredPhoto(photo) {
  // If the image is in sessionStorage, we just return it from there.
  const imageUrl = sessionStorage.getItem(`cache-${photo.id}`);
  if (imageUrl !== null) {
    const imageObject = {
      object: await getImageFromUrl(imageUrl),
      url: imageUrl,
    };
    return imageObject;
  }

  // Get the image from URL.
  const imageObj =
      await getImageFromUrl(`/photo?blob-key=${photo.blobKeyString}`);

  // Convert rectangles returned by the request to Rect objects to be used
  // by our functions.
  const responseRects = JSON.parse(photo.jsonBlurRectangles);
  const blurRects = [];
  for (const area of responseRects) {
    let rect;
    try {
      rect = new Rect(area, imageObj);
    } catch (error) {
      // If rect is invalid, log and ignore it.
      console.log('Invalid rectangle : ' + error.message,
          area);
      continue;
    }
    blurRects.push(rect);
  }

  // Blur the image with the default blur radius and return it.
  const blurRadius = getDefaultBlurRadius(blurRects);
  const imageDetails = {
    object: imageObj,
    blurAreas: blurRects,
  };
  return getImageWithBlurredAreas(imageDetails, blurRadius);
}

/**
 * Function that preloads some of the photos in sessionStorage.
 * Assigns each photo a value and uses the Knapsack algorithm to decide which
 * photos to load in maximum CACHE_SIZE space so that the sum of their value is
 * the biggest.
*/
async function preloadPhotos() {
  // Fetch photos information from the server.
  const photosResponse = await fetch('/photos');
  const photos = await photosResponse.json();

  if (photos.length === 0) {
    return;
  }

  // Assign each photo a value.
  const serverTimeResponse = await fetch('server-time');
  const currentDate = Date.parse(await serverTimeResponse.text());
  for (const photo of photos) {
    // We divide by 1000 to convert from miliseconds to seconds.
    const secondsOld = (currentDate - Date.parse(photo.dateCreated)) / 1000;
    photo.value = 1 / secondsOld;
  }

  const photosToSave = await getPhotosToSave(photos);

  // Update sessionStorage with our new photos.
  sessionStorage.clear();
  for (const photo of photosToSave) {
    sessionStorage.setItem(`cache-${photo.id}`, photo.serialized);
  }
}

/**
 * Helper function that uses the Knapsack algorithm to decide which of the
 * photos to cache to maximize the sum of their values and not exceed the
 * CACHE_SIZE storage space. Each photo has a value and a sizeInKB variable.
 * @param {Array<photo>} photos 
 * @return {Array<photo>}
 */
async function getPhotosToSave(photos) {
  const CACHE_SIZE = Math.floor(0.4 * 1024)
  // dp[i][j] = maximum value that can be achieved using only
  // some of the first i photos and exactly j KB
  const dp = new Array(photos.length);

  for (let i = 0; i < photos.length; ++i) {
    dp[i] = new Array(CACHE_SIZE);
    for (let size = 0; size <= CACHE_SIZE; ++size) {
      // Value achieved if we don't use ith photo.
      let oldValue;
      if (i === 0) {
        oldValue = 0;
      } else {
        oldValue = dp[i-1][size];
      }

      // If the size we are considering is bigger than ith photo,
      // we can consider to use it.
      if (size >= photos[i].sizeInKB) {
        // Value achieved if we use ith photo.
        let newValue;
        if (i === 0) {
          newValue = photos[i].value;
        } else {
          newValue = dp[i-1][size - photos[i].sizeInKB] + photos[i].value;
        }

        // Find out which value is bigger.
        if (newValue > oldValue) {
          dp[i][size] = newValue;
        } else {
          dp[i][size] = oldValue;
        }
      } else {
        dp[i][size] = oldValue;
      }
    }
  }

  // Find out what is the maximum value we can obtain and for which size.
  let maxValue = 0;
  let maxValueSize = 0;
  for (let size = 0; size <= CACHE_SIZE; ++size) {
    if (dp[photos.length-1][size] > maxValue) {
      maxValue = dp[photos.length - 1][size];
      maxValueSize = size;
    }
  }

  // Find out which photos we used to get this maximum value.
  const photosToSave = [];
  let sizeLeft = maxValueSize;
  for (let i = photos.length - 1; i >= 1; --i) {
    // If the value is greater than the previous one, it means we used
    // the ith photo.
    if (dp[i][sizeLeft] > dp[i-1][sizeLeft]) {
      // Add the photo to our array.
      const photoToSave = {
        serialized: (await loadBlurredPhoto(photos[i])).url,
        id: photos[i].id,
      };
      photosToSave.push(photoToSave);
      sizeLeft -= photos[i].sizeInKB;
    }
  }
  // We have to consider separately this case because their is no previous
  // value.
  if (dp[0][sizeLeft] > 0) {
    const photoToSave = {
      serialized: (await loadBlurredPhoto(photos[0])).url,
      id: photos[0].id,
    };
    photosToSave.push(photoToSave);
  }

  return photosToSave;
}
