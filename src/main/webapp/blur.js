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

// suppress linter error -
// getImageWithFilledAreas, getImageWithBlurredAreas
// and getImageWithBlurredByUsAreas
// functions are used from another file.
/* eslint no-unused-vars:
["error", { "varsIgnorePattern":
"getImageWithFilledAreas|getImageWithBlurredAreas|
|getImageWithBlurredByUsAreas" }] */

'use strict';

/**
 * Function to get image with some areas filled
 * with an average color of an image.
 * @param {ImageObject} image Initial image.
 * @return {ImageObject} canvas with image with filled areas.
 */
function getImageWithFilledAreas(image) {
  const resultCanvas = createCanvasForImage(image.object);
  const resultCtx = resultCanvas.getContext('2d');

  resultCtx.drawImage(image.object, 0, 0);

  resultCtx.fillStyle = getAverageColor(image.object);

  for (const rect of image.blurAreas) {
    if (!rect.toBeBlurred) {
      continue;
    }

    resultCtx.fillRect(rect.leftX, rect.topY, rect.width, rect.height);
  }

  return new ImageObject(resultCanvas.toDataURL(image.type), resultCanvas,
      'filled-'+image.fileName, image.type, image.blurAreas);
}

/**
 * Function to get average color of an image.
 * @param {Image} image
 * @return {string} hex string representing color.
 */
function getAverageColor(image) {
  const colorThief = new ColorThief();
  const averageColorRgb = colorThief.getColor(image);

  const rgbToHex = (r, g, b) => ('#' + [r, g, b].map((x) => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join(''));

  return rgbToHex(...averageColorRgb);
}

/**
 * Function to get image with some areas blurred.
 * We use two canvases for this. On one canvas
 * we put blurred image. On another canvas
 * we out not-blurred image and then delete
 * from it all the areas that we want to blur.
 * While deleting the areas, we erase not just sharp rectangles,
 * but blurred rectangles, which will look like smooth edges
 * of deleted rectangles.
 * Then we put the canvas with erased areas on top of
 * the blurred canvas and return that.
 * @param {ImageObject} image
 * @param {Number} blurRadius
 * @return {ImageObject}
 */
function getImageWithBlurredAreas(image, blurRadius) {
  // Create canvas and put original image on it.
  const withoutBlurAreasCanvas = createCanvasForImage(image.object);
  const withoutBlurAreasCtx = withoutBlurAreasCanvas.getContext('2d');

  withoutBlurAreasCtx.drawImage(image.object, 0, 0);

  // For smoothing edges of blurred areas.
  withoutBlurAreasCtx.globalCompositeOperation = 'destination-out';
  withoutBlurAreasCtx.filter = `blur(${blurRadius / 2}px)`; // smoothing radius

  // Delete areas to blur from this canvas.
  for (const rect of image.blurAreas) {
    if (!rect.toBeBlurred) {
      continue;
    }

    withoutBlurAreasCtx.fillRect(
        rect.leftX, rect.topY, rect.width, rect.height);
  }

  // Create canvas and put blurred image on it.
  const blurredCanvas = createCanvasForImage(image.object);
  const blurredCtx = blurredCanvas.getContext('2d');

  blurredCtx.filter = `blur(${blurRadius}px)`;
  blurredCtx.drawImage(image.object, 0, 0);

  // Draw the original image with smoothed holes in place of
  // areas to blur on top of blurred canvas.
  blurredCtx.filter = 'none';
  blurredCtx.drawImage(withoutBlurAreasCanvas, 0, 0);

  return new ImageObject(blurredCanvas.toDataURL(image.type), blurredCanvas,
      'blurred-'+image.fileName, image.type, image.blurAreas);
}

/**
 * Function to create a kernel matrix.
 * The idea is that we have some function of 1 argument
 * called f, which we rotate and get function of 2 arguments.
 * Each cell in matrix has a coordinate (x, y), and we want
 * those coordinates to begin in the center of the matrix, i.e.
 * (kernelSize/2, kernelSize/2) cell is (0, 0) coordinate -
 * this is because the center of a matrix will be then multiplied by
 * the original pixel for which we calculate blurred color.
 * We get our function value for each of the coordinates and
 * put it in kernel matrix.
 * We also norm kernel matrix, so that the sum of all the
 * cells will equal 1 => the general brightness of a pixel
 * will not change when we apply kernel matrix.
 * @param {Number} kernelSize
 * @return {Array<Array<Number>>} kernel matrix
 */
function getKernel(kernelSize) {
  // Get argument for our linear function from kernel cell
  // indexes. Norm it to be a number between 0 and 1.
  const getArg = (i, j) => {
    const x = (2 * i - kernelSize + 1) / kernelSize;
    const y = (2 * j - kernelSize + 1) / kernelSize;
    return Math.sqrt(x * x + y * y);
  };

  // This can be any function which approaches zero in infinity.
  // The argument we pass here is always a number between 0 and 1.
  const f = (x) => {
    return 1 - (3 * x - x * x * x) / 2;
  };

  const kernel = [];

  let normCoef = 0;

  for (let i = 0; i < kernelSize; ++i) {
    kernel.push([]);
    for (let j = 0; j < kernelSize; ++j) {
      const arg = getArg(i, j);
      kernel[i].push(f(arg));
      normCoef += f(arg);
    }
  }

  for (let i = 0; i < kernelSize; ++i) {
    for (let j = 0; j < kernelSize; ++j) {
      kernel[i][j] /= normCoef;
    }
  }

  return kernel;
}

/**
 * Constructs Color object from RGBA numbers.
 * @param {Number} red
 * @param {Number} green
 * @param {Number} blue
 * @param {Number} alpha
 * @constructor
 */
function Color(red, green, blue, alpha) {
  this.red = red;
  this.green = green;
  this.blue = blue;
  this.alpha = alpha;

  /**
   * Adds another Color to this.
   * @param {Color} otherColor
   */
  this.add = (otherColor) => {
    this.red += otherColor.red;
    this.blue += otherColor.blue;
    this.green += otherColor.green;
    this.alpha += otherColor.alpha;
  };

  /**
   * Multiples this color by some number.
   * @param {Number} num
   */
  this.multiple = (num) => {
    this.red *= num;
    this.blue *= num;
    this.green *= num;
    this.alpha *= num;
  };
}

/**
 * Function to get Color of pixel from imageData.
 * @param {Number} x
 * @param {Number} y
 * @param {ImageData} imageData
 * @param {Color} defaultColor Color to return if
 *     imageData doesn't have (x, y) pixel.
 * @return {Color} color of (x, y) pixel.
 */
function getColorForCoord(x, y, imageData,
                          defaultColor = new Color(0, 0, 0, 0)) {
  const redIndex = y * (imageData.width * 4) + x * 4;

  if (0 <= redIndex && redIndex + 3 < imageData.data.length) {
    return new Color(imageData.data[redIndex], imageData.data[redIndex + 1],
        imageData.data[redIndex + 2], imageData.data[redIndex + 3]);
  }

  return new Color(defaultColor.red, defaultColor.green,
      defaultColor.blue, defaultColor.alpha);
}

/**
 * Function to get blurred rectangle.
 * @param {ImageData} originalData
 * @param {Array<Array<Number>>} kernel
 * @param {Array<Array<Number>>} smoothKernel
 * @param {Object} smoothSizes
 * @return {ImageData} blurredData
 */
function getBlurredData(originalData, kernel, smoothKernel, smoothSizes) {
  const blurredCanvas = document.createElement('canvas');
  blurredCanvas.width = originalData.width;
  blurredCanvas.height = originalData.height;
  const blurredCtx = blurredCanvas.getContext('2d');
  const blurredData = blurredCtx.createImageData(originalData);

  for (let y = 0; y < originalData.height; ++y) {
    for (let x = 0; x < originalData.width; ++x) {
      // the blurred color of the pixel we are looking at.
      const newColor = new Color(0, 0, 0, 0);

      // should we blur or smooth current pixel.
      let curKernel = kernel;
      if (y < smoothSizes.top ||
          originalData.height - y < smoothSizes.bottom ||
          x < smoothSizes.left ||
          originalData.width - x < smoothSizes.right) {
        curKernel = smoothKernel;
      }

      // if we have to look at the pixel which is out of borders of
      // data provided to us - use original pixel color.
      const defaultColor = getColorForCoord(x, y, originalData);

      for (let i = 0; i < curKernel.length; ++i) {
        for (let j = 0; j < curKernel.length; ++j) {
          const halfKernelLen = Math.floor(curKernel.length / 2);

          const curColor = getColorForCoord(x + j - halfKernelLen,
              y + i - halfKernelLen, originalData, defaultColor);

          curColor.multiple(curKernel[i][j]);
          newColor.add(curColor);
        }
      }

      // colors are stored in ImageData in RGBA format in
      // one-dimentional array. Get the index of red color
      // in that array. Then green color will have red + 1 index,
      // etc.
      const redIndex = y * (blurredData.width * 4) + x * 4;
      blurredData.data[redIndex] = newColor.red;
      blurredData.data[redIndex + 1] = newColor.green;
      blurredData.data[redIndex + 2] = newColor.blue;
      blurredData.data[redIndex + 3] = newColor.alpha;
    }
  }

  return blurredData;
}

/**
 * Function to get image with some areas blurred.
 * We use our own implementation of blurring
 * algorithm here. The idea is that we construct some
 * squared matrix called kernel, then we move that
 * kernel through our image pixels and recalculate
 * each pixel as kernel_matrix * matrix_of_pixels_around_ours.
 * We also apply smooth edges by blurring some place around
 * rectangles with less blurRadius.
 * @param {ImageObject} image
 * @param {Number} blurRadius
 * @return {ImageObject}
 */
function getImageWithBlurredByUsAreas(image, blurRadius) {
  const kernelSize = blurRadius;
  const kernel = getKernel(kernelSize);

  // the less kernelSize - the less blur will be applied.
  const smoothKernel = getKernel(kernelSize / 2);

  const originalCanvas = createCanvasForImage(image.object);
  const originalCtx = originalCanvas.getContext('2d');
  originalCtx.drawImage(image.object, 0, 0);

  const blurredCanvas = createCanvasForImage(image.object);
  const blurredCtx = blurredCanvas.getContext('2d');
  blurredCtx.drawImage(image.object, 0, 0);

  for (const rect of image.blurAreas) {
    if (!rect.toBeBlurred) {
      continue;
    }

    const smoothEdgesSizes = {
      'top': Math.min(rect.topY, rect.height / 7),
      'bottom': Math.min(
          image.object.height - rect.height - rect.topY, rect.height / 7),
      'left': Math.min(
          rect.leftX, rect.width / 7),
      'right': Math.min(
          image.object.width - rect.width - rect.leftX, rect.width / 7),
    };

    const originalAreaData = originalCtx.getImageData(
        rect.leftX - smoothEdgesSizes.left,
        rect.topY - smoothEdgesSizes.top,
        rect.width + smoothEdgesSizes.left + smoothEdgesSizes.right,
        rect.height + smoothEdgesSizes.bottom + smoothEdgesSizes.top);

    const blurredAreaData = getBlurredData(originalAreaData, kernel,
        smoothKernel, smoothEdgesSizes);

    blurredCtx.putImageData(blurredAreaData, rect.leftX - smoothEdgesSizes.left,
        rect.topY - smoothEdgesSizes.top);
  }
  return new ImageObject(blurredCanvas.toDataURL(image.type), blurredCanvas,
      'blurred-' + image.fileName, image.type, image.blurAreas);
}
