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

'use strict';

/**
 * Function to create canvas with width and height
 * of an image.
 * @param {Image} image
 * @return {HTMLCanvasElement}
 */
function createCanvasForImage(image){
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;

  return canvas;
}

/**
 * Function to get image with some areas blurred.
 * For now they are not blurred, but filled with
 * average color of an image.
 * @param {Array<Rect>} rectsToBlur Areas to blur.
 * @param {Image} image Initial image.
 * @return {HTMLCanvasElement} canvas with image with blurred areas.
 */
function getImageWithBlurredAreas(rectsToBlur, image) {
  const resultCanvas = createCanvasForImage(image);
  const resultCtx = resultCanvas.getContext('2d');

  resultCtx.drawImage(image, 0, 0);

  resultCtx.fillStyle = getAverageColor(image);

  for (const rect of rectsToBlur) {
    resultCtx.fillRect(rect.leftX, rect.topY, rect.width, rect.height);
  }

  return resultCanvas;
}

/**
 * Function to get average color of an image.
 * @param {Image} image
 * @return {string} hex string representing color.
 */
function getAverageColor(image) {
  const colorThief = new ColorThief();
  const averageColorRgb = colorThief.getColor(image);

  const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');

  return rgbToHex(...averageColorRgb);
}
