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
 * Function which is called when page loads.
 * Add event listener to image upload button.
 * Add canvases to the page, put sample image to them.
 */
document.addEventListener('DOMContentLoaded', () => {
  const CANVAS_WIDTH = 300;

  const SAMPLE_IMAGE_URL = 'images/sample-image.jpeg';
  const SAMPLE_IMAGE_BLUR_AREAS = [
    {leftX: 87, topY: 405, height: 52, width: 50},
    {leftX: 599, topY: 365, height: 73, width: 72},
    {leftX: 460, topY: 329, height: 77, width: 76},
    {leftX: 254, topY: 456, height: 48, width: 47},
  ];

  const uploadButton = document.getElementById('upload-image');
  uploadButton.addEventListener('change', handleImageUpload);

  const imagesContainer = document.getElementById('images-container');

  // put canvases into image container on html page.
  const inputCanvas = createCanvasForId('input-canvas');
  inputCanvas.setAttribute('width', CANVAS_WIDTH);
  imagesContainer.append(inputCanvas);

  const outputCanvas = createCanvasForId('output-canvas');
  outputCanvas.setAttribute('width', CANVAS_WIDTH);
  imagesContainer.append(outputCanvas);

  // put blur radius input into the image container
  const rangeInput = createBlurRadiusInput();
  imagesContainer.append(rangeInput);

  // add sample image on page - original and blurred one.
  processImage(SAMPLE_IMAGE_URL, SAMPLE_IMAGE_BLUR_AREAS);
});

/**
 * Function to create scrolling bar for blurRadius.
 * @return {HTMLInputElement}
 */
function createBlurRadiusInput() {
  const rangeInput = document.createElement('input');

  rangeInput.setAttribute('type', 'range');
  rangeInput.setAttribute('id', 'blurring-radius');
  rangeInput.setAttribute('min', 0);

  return rangeInput;
}

/**
 * Function which is called when user chooses file to upload.
 * @param {Event} event "Change" event on image upload button.
 */
async function handleImageUpload(event) {
  await validateImageUpload().then(async () => {
    // blur the image and update html page.
    const imageUrl = URL.createObjectURL(event.target.files[0]);

    const blurAreas = await getBlurAreas(event.target.files[0]);

    processImage(imageUrl, blurAreas);
  }).catch((error) => {
    alert(error.message);
  });
}

/**
 * Creates canvas with specified id.
 * @param {string} id
 * @return {HTMLCanvasElement} canvas DOM element
 */
function createCanvasForId(id) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('id', id);

  return canvas;
}

/**
 * Updates the page with new uploaded image.
 * It calls blurring method, puts new and blurred
 * images on canvases and updates blurRadius input
 * bar for new image.
 * @param {String} imageUrl
 * @param {Array<Rect>} blurAreas
 * @return {Promise<void>} nothing
 */
async function processImage(imageUrl, blurAreas) {
  const imageObj = await getImageFromUrl(imageUrl);

  const inputCanvas = document.getElementById('input-canvas');
  const outputCanvas = document.getElementById('output-canvas');

  // set blurRadiusInput bar max and default values.
  const blurRadiusInput = document.getElementById('blurring-radius');

  blurRadiusInput.setAttribute('max', Math.ceil(
      getAverageRectSize(blurAreas) / (100 * 100) * 12 * 2));
  blurRadiusInput.setAttribute('value', blurRadiusInput.max / 2);

  // reblur image every time user scrolls the blurRadiusInput bar.
  blurRadiusInput.addEventListener('change', (event) => {
    const blurredImage = getImageWithBlurredAreas(
        blurAreas, imageObj, blurRadiusInput.value);
    drawImageOnCanvas(blurredImage, outputCanvas);
  });

  // draw original and blurred images on page.
  drawImageOnCanvas(imageObj, inputCanvas);
  const blurredImage = getImageWithBlurredAreas(
      blurAreas, imageObj, blurRadiusInput.value);
  drawImageOnCanvas(blurredImage, outputCanvas);
}

/**
 * Helper function to get average rect size of
 * rects to blur. Rect size is its width x height.
 * @param {Array<Rect>} blurAreas
 * @return {Number} average rect size.
 */
function getAverageRectSize(blurAreas) {
  let sumDimensions = 0;

  for (const rect of blurAreas) {
    sumDimensions += rect.width * rect.height;
  }

  return sumDimensions / blurAreas.length;
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
