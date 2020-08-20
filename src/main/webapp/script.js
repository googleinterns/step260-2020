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
 * Add event listener to image upload button
 * Add canvases to the page, put sample image to them.
 */
document.addEventListener('DOMContentLoaded', () => {
    const uploadButton = document.getElementById('upload-image');
    uploadButton.addEventListener('change', handleImageUpload);

    const SAMPLE_IMAGE_URL = 'images/hadgehog.jpg';

    const imagesContainer = document.getElementById('images-container');

    // put canvases into image container on html page
    const inputCanvas = createCanvas('input-canvas');
    imagesContainer.append(inputCanvas);

    const outputCanvas = createCanvas('output-canvas');
    imagesContainer.append(outputCanvas);

    // add sample image on page - original and blurred one.
    blur(SAMPLE_IMAGE_URL);
});

/**
 * Fuction which is called when user chooses file to upload
 */
function handleImageUpload(event) {
    if (!validateImageUpload()) {
        return;
    }
    
    const imageUrl = URL.createObjectURL(event.target.files[0]);
    blur(imageUrl);
}

/**
 * Function to validate the uploaded image
 * @return {Boolean}
 */
function validateImageUpload() {
    const fileName = document.getElementById('upload-image').value;
    
    // if nothing was uploaded
    if (fileName === '') {
        alert('We can blur anything only if you upload an image');
        return false;
    }
    
    // validate file extension
    const SUPPORTED_EXTENSIONS = ['png', 'jpeg', 'jpg'];
    const fileExtension = fileName.substring(
        fileName.lastIndexOf('.') + 1).toLowerCase();
    
    if (!SUPPORTED_EXTENSIONS.includes(fileExtension)) {
        alert('We can support only jpg, jpeg and png images, sorry :(');
        return false;
    }
    
    return true;
}

/**
 * @param {string} id
 * @return {HTMLCanvasElement} canvas DOM element
 */
function createCanvas(id) {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('id', id);

    return canvas;
}

/**
 * Modifies canvas width and height to be width and height of an image.
 * @param {HTMLCanvasElement} canvas
 * @param {Image} image
 */
function updateCanvasDimentionsForImage(canvas, image) {
    // clear canvas
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

    canvas.setAttribute('width', image.width);
    canvas.setAttribute('height', image.height);
}

/**
 * Function to handle all the blurring process
 * and putting both blurred and original images on page
 * @param {string} imageUrl
 */
async function blur(imageUrl) {
    // get areas to blur from server
    const rectsToBlurPromise = getBlurAreas();

    // create Imge object from url to put it on canvases
    const imageObj = new Image();
    imageObj.src = imageUrl;

    // need to wait until image loads to put it anywhere
    imageObj.onload = () => {
        prepareHtmlElements(imageObj);

        // we need it for blurring only. The user won't see it.
        const hiddenCanvas = getHiddenCanvas(imageObj);

        // wait for server to respond and finish blurring
        rectsToBlurPromise.then((rects) => {
            blurAreas(rects, hiddenCanvas);
            createDownloadButton();
        }).catch((error) => console.log('Error in getBlurAreas function'));
    }
}

/**
 * Function to create canvas and draw blurred image on it.
 * This canvas will not be appended to DOM
 * @param {Image} image
 * @return {HTMLCanvasElement} hiddenCanvas with blurred image on it
 */
function getHiddenCanvas(image) {
    const hiddenCanvas = createCanvas('hidden-canvas');
    updateCanvasDimentionsForImage(hiddenCanvas, image);

    const hiddenCtx = hiddenCanvas.getContext('2d');
    hiddenCtx.filter = 'blur(5px)';
    hiddenCtx.drawImage(image, 0, 0);

    return hiddenCanvas;
}

/**
 * Fucntion to update html page for blurring a new image.
 * It resizes canvases and draws new image on them.
 * It deletes previous download button if there was.
 * @param {Image} image
 */
function prepareHtmlElements(image) {
    const prepareCanvas = (canvasId) => {
        const canvas = document.getElementById(canvasId);
        updateCanvasDimentionsForImage(canvas, image);

        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
    }
    prepareCanvas('input-canvas');
    prepareCanvas('output-canvas');
    
    // remove download button
    const downloadButton = document.getElementById('download-button');
    if (downloadButton !== null) {
        downloadButton.remove();
    }
}

/**
 * Class for a rectangle to blur
 */
class Rect {
    /**
     * @param {function} func Can be min or max function
     * @param {string} property Property which all the items
     *                          in arrayObject have
     * @param {arrayObject} array of Objects
     * @return min or max (depending on func) value of the
     *         specified property among arrayObject items.
     */
    static get(func, property, arrayObject) {
        let ans = arrayObject[0][property];

        for (let item of arrayObject) {
            ans = func(ans, item[property]);
        }

        return ans;
    }

    /**
     * @constructor
     * @param {JsonRect} _rect
     * Constructs Rect from rectangle object we get from json
     * Rectange object we get from json has 4 points - its corners,
     * our Rect has top left corner, width and height.
     */
    constructor(_rect) {
        this.leftX = Rect.get(Math.min, 'x', _rect);
        this.topY = Rect.get(Math.min, 'y', _rect);
        this.width = Rect.get(Math.max, 'x', _rect) - this.leftX;
        this.height = Rect.get(Math.max, 'y', _rect) - this.topY;
    }
}

/**
 * Function that blurs specific rectangles and puts in on outputCanvas
 * @param {Array<JsonRect>} rectsToBlur Rectangles to blur that we get from
 *                                      server
 * @param {HTMLCanvasElement} hiddenCanvas Canvas with blurred image on it
 */
function blurAreas(rectsToBlur, hiddenCanvas) {
    const outputCanvas = document.getElementById('output-canvas');
    const outputCtx = outputCanvas.getContext('2d');

    const hiddenCtx = hiddenCanvas.getContext('2d');

    for (let _rect of rectsToBlur) {
        const rect = new Rect(_rect);

        // get blurred rectangle from blurred canvas
        const blurredItem = hiddenCtx.getImageData(rect.leftX, rect.topY, rect.width, rect.height);

        // put that rectangle on output canvas
        outputCtx.putImageData(blurredItem, rect.leftX, rect.topY);
    }
}

/**
 * Function to create and add to DOM button to download
 * blurred image
 */
function createDownloadButton() {
    // get url of blurred image
    const outputCanvas = document.getElementById('output-canvas');
    const imageUrl = outputCanvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');

    // create button element
    const downloadButton = document.createElement('a');
    downloadButton.setAttribute('id', 'download-button');
    downloadButton.innerHTML = 'Download';

    // set download url to the button
    downloadButton.setAttribute('download', 'ImageBlurredInTheBestApp.png');
    downloadButton.setAttribute('href', imageUrl);

    // put button on the page
    const imagesContainer = document.getElementById('images-container');
    imagesContainer.append(downloadButton);
}

// now for testing purposes only
/**
 * Function to get rectangles to blur from server
 * @return {Array<JsonRect>} rectangles to blur
 */
async function getBlurAreas() {
    return [[{
        'x': 0,
        'y': 0
    }, {
        'x': 300,
        'y': 0
    }, {
        'x': 300,
        'y': 300
    }, {
        'x': 0,
        'y': 300
    }], [{
        'x': 200,
        'y': 200
    }, {
        'x': 400,
        'y': 200
    }, {
        'x': 400,
        'y': 400
    }, {
        'x': 200,
        'y': 400
    }]];
}
