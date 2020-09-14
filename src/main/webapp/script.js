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
document.addEventListener('DOMContentLoaded', async () => {
  const CANVAS_WIDTH = 300;

  const sampleImage = new ImageObject('images/sample-image.jpeg',
      await getImageFromUrl('images/sample-image.jpeg'),
      'sample-image.jpeg', 'image/jpeg', [
        {leftX: 87, topY: 405, height: 52, width: 50},
        {leftX: 599, topY: 365, height: 73, width: 72},
        {leftX: 460, topY: 329, height: 77, width: 76},
        {leftX: 254, topY: 456, height: 48, width: 47},
      ]);

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

  // put download button into the image container
  const downloadButton = createDownloadButton();
  imagesContainer.append(downloadButton);

  // add sample image on page - original and blurred one.
  processImage(sampleImage);
});

/**
 * Constructor for image object.
 * @param {String} imageUrl
 * @param {Image|HTMLCanvasElement}imageObject
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
 * Function to create a button to download
 * blurred image.
 * @return {HTMLAnchorElement}
 */
function createDownloadButton() {
  const downloadButton = document.createElement('a');
  downloadButton.setAttribute('id', 'download-button');
  downloadButton.innerHTML = 'Download';

  return downloadButton;
}

/**
 * Function which is called when user chooses file to upload.
 * @param {Event} event "Change" event on image upload button.
 */
async function handleImageUpload(event) {
  await validateImageUpload().then(async () => {
    // blur the image and update html page.
    const imageUrl = URL.createObjectURL(event.target.files[0]);

    const imageObject = await getImageFromUrl(imageUrl);

    const blurAreas = await getBlurAreas(event.target.files[0]);

    const imageType = getImageTypeOrError(event.target.files[0]);

    const fileName = event.target.files[0].name;

    const image = new ImageObject(imageUrl, imageObject, fileName,
        imageType, blurAreas);
    processImage(image);
  }).catch((error) => {
    alert('ERROR: ' + error.message);
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
 * images on canvases, updates blurRadius input
 * bar for new image and download button for
 * every new blurred image.
 * @param {ImageObject} image
 */
async function processImage(image) {
  const inputCanvas = document.getElementById('input-canvas');
  const outputCanvas = document.getElementById('output-canvas');

  updateBlurRadiusInputBar(image);

  const blurRadiusInput = document.getElementById('blurring-radius');

  // draw original and blurred images on page.
  drawImageOnCanvas(image, inputCanvas);

  const blurredImage = getImageWithBlurredAreas(
      image, blurRadiusInput.value);
  drawImageOnCanvas(blurredImage, outputCanvas);

  updateDownloadButton(blurredImage);
}

/**
 * Function to update download button to download new image.
 * @param {ImageObject} image Image that we are making a
 * download button for.
 */
function updateDownloadButton(image) {
  const downloadButton = document.getElementById('download-button');

  downloadButton.href = image.url;

  // the name of the file which will be downloaded.
  downloadButton.download = image.fileName;
}

/**
 * Function to update blur radius input bar for new image.
 * Sets max and default values to the bar, adds event
 * listener to reblur the image when the bar is scrolled.
 * We get the formula for default value from experiments and
 * set max value to defaultValue * 2.
 * We decided that the best blurRadius value
 * depends mostly on the size of the area that we want to blur,
 * which is why we have some sample area and adjust the best
 * blur radius for it (which we get by experiments) to our
 * image's blurAreas sizes.
 * @param {ImageObject} image
 */
function updateBlurRadiusInputBar(image) {
  const SAMPLE_AREA_SIZE = 100 * 100;
  const SAMPLE_BEST_BLUR_RADIUS = 12;

  const DEFAULT_VALUE = Math.ceil(getAverageRectsArea(image.blurAreas) /
      SAMPLE_AREA_SIZE * SAMPLE_BEST_BLUR_RADIUS);

  const blurRadiusInput = document.getElementById('blurring-radius');

  blurRadiusInput.max = DEFAULT_VALUE * 2;
  blurRadiusInput.value = DEFAULT_VALUE;

  const outputCanvas = document.getElementById('output-canvas');

  // reblur image every time user scrolls the blurRadiusInput bar.
  blurRadiusInput.onchange = (event) => {
    const blurredImage = getImageWithBlurredAreas(
        image, event.target.value);
    drawImageOnCanvas(blurredImage, outputCanvas);

    updateDownloadButton(blurredImage);
  };
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
 * Function to draw image on canvas.
 * Width of canvas should be constant, height adjusts for
 * the image proportions.
 * @param {ImageObject} image
 * @param {HTMLCanvasElement} canvas
 */
function drawImageOnCanvas(image, canvas) {
  const ctx = canvas.getContext('2d');

  // clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // resize canvas height to fit new image
  canvas.height = image.object.height * canvas.width / image.object.width;

  // draw new image on it, scaling the image to fit in canvas
  ctx.drawImage(image.object, 0, 0, canvas.width, canvas.height);
}
