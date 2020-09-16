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
"getImageFromUrl|getDefaultBlurRadius|" }] */

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
  // for unblurring feature.
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
