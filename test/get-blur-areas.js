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


describe('Connection with server part', () => {
  // we show errors to user by alert.
  // disable it for testing
  alert = function() {
  };

  /**
   * Helper function to check if the responses with rects are equal.
   * These responses are objects, and simple '==' will
   * compare references of objects, so it doesn't work
   * @param {Array<Rect>} response1
   * @param {Array<Rect>} response2
   * @return {boolean}
   */
  function areRectResponsesEqual(response1, response2) {
    if (!Array.isArray(response1) || !Array.isArray(response2)) {
      return false;
    }

    if (response1.length !== response2.length) {
      return false;
    }

    for (let i = 0; i < response1.length; i++) {
      if (!areRectsEqual(response1[i], response2[i])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Helper function to check if rect objects are equal.
   * These rects are objects, and simple '==' will
   * compare references of objects, so it doesn't work
   * @param {Rect} rect1
   * @param {Rect} rect2
   * @return {boolean}
   */
  function areRectsEqual(rect1, rect2) {
    const REQUIRED_PROPERTIES = ['leftX', 'topY', 'width', 'height'];

    for (const property of REQUIRED_PROPERTIES) {
      if (!rect1.hasOwnProperty(property) ||
          !rect2.hasOwnProperty(property) ||
          rect1[property] !== rect2[property]) {
        return false;
      }
    }

    return true;
  }

  describe('getFormUploadUrl()', () => {
    it('check that it fetchs expected url using get method' +
        'and gets response from it', async () => {
      const FETCH_URL = '/blobstore-upload-url?forwardurl=/get-blur-areas';
      const RESPONSE_URL = 'someUrl';
      fetchMock.get(FETCH_URL, RESPONSE_URL);

      const response = await getFormUploadUrl();
      expect(response).to.equal(RESPONSE_URL);

      fetchMock.restore();
    });

    it('400 error on server side', () => {
      return new Promise(function(resolve, reject) {
        const FETCH_URL = '/blobstore-upload-url?forwardurl=/get-blur-areas';
        const STATUS_CODE = 400;
        fetchMock.get(FETCH_URL, STATUS_CODE);

        getFormUploadUrl().catch((error) => {
          expect(() => {
            throw error;
          }).to.throw(STATUS_CODE + ' server error');
          fetchMock.restore();
          resolve();
        });
      });
    });

    it('unknown error while fetching', () => {
      return new Promise(function(resolve, reject) {
        const FETCH_URL = '/blobstore-upload-url?forwardurl=/get-blur-areas';
        const ERROR_MESSAGE = 'Unknown error';

        fetchMock.get(FETCH_URL, {throws: new Error(ERROR_MESSAGE)});

        getFormUploadUrl().catch((error) => {
          expect(() => {
            throw error;
          }).to.throw(ERROR_MESSAGE);
          fetchMock.restore();
          resolve();
        });
      });
    });
  });

  describe('getBlurAreas()', () => {
    before(async () => {
      this.image = await getFileObject('test-files/64kb.jpg');
    });

    it('invalid blobstore upload url', () => {
      return new Promise(function(resolve, reject) {
        const FETCH_URL_TO_BLOBSTORE =
            '/blobstore-upload-url?forwardurl=/get-blur-areas';
        const STATUS_CODE = 400;

        fetchMock.get(FETCH_URL_TO_BLOBSTORE, STATUS_CODE);

        getBlurAreas(image).catch((error) => {
          expect(() => {
            throw error;
          }).to.throw(STATUS_CODE + ' server error');
          fetchMock.restore();
          resolve();
        });
      });
    });

    it('some error on server side while sending image', () => {
      return new Promise(function(resolve, reject) {
        const FETCH_URL_TO_BLOBSTORE =
            '/blobstore-upload-url?forwardurl=/get-blur-areas';
        const POST_URL = 'postUrlFromBlobstore';

        fetchMock.get(FETCH_URL_TO_BLOBSTORE, POST_URL);

        const ERROR_MESSAGE = 'some error message';

        fetchMock.post(POST_URL, {throws: ERROR_MESSAGE});

        getBlurAreas(image).catch((error) => {
          expect(() => {
            throw error;
          }).to.throw(ERROR_MESSAGE);
          fetchMock.restore();
          resolve();
        });
      });
    });

    it('400 error on server side while sending image', () => {
      return new Promise(function(resolve, reject) {
        const FETCH_URL_TO_BLOBSTORE =
            '/blobstore-upload-url?forwardurl=/get-blur-areas';
        const POST_URL = 'postUrlFromBlobstore';

        fetchMock.get(FETCH_URL_TO_BLOBSTORE, POST_URL);

        const STATUS_CODE = 400;

        fetchMock.post(POST_URL, STATUS_CODE);

        getBlurAreas(image).catch((error) => {
          expect(() => {
            throw error;
          }).to.throw(STATUS_CODE + ' server error');
          fetchMock.restore();
          resolve();
        });
      });
    });

    it('empty response', () => {
      return new Promise(function(resolve, reject) {
        const FETCH_URL_TO_BLOBSTORE =
            '/blobstore-upload-url?forwardurl=/get-blur-areas';
        const POST_URL = 'postUrlFromBlobstore';

        fetchMock.get(FETCH_URL_TO_BLOBSTORE, POST_URL);

        const RESPONSE = [];

        fetchMock.post(POST_URL, RESPONSE);

        getBlurAreas(image).then((response) => {
          expect(areRectResponsesEqual(response, [])).to.be.true;
          fetchMock.restore();
          resolve();
        });
      });
    });

    it('broken response from server - not an array of objects', () => {
      return new Promise(function(resolve, reject) {
        const FETCH_URL_TO_BLOBSTORE =
            '/blobstore-upload-url?forwardurl=/get-blur-areas';
        const POST_URL = 'postUrlFromBlobstore';

        fetchMock.get(FETCH_URL_TO_BLOBSTORE, POST_URL);

        const RESPONSE = {prop: 'value'};

        fetchMock.post(POST_URL, RESPONSE);

        getBlurAreas(image).catch((error) => {
          expect(() => {
            throw error;
          }).to.throw('Broken json');
          fetchMock.restore();
          resolve();
        });
      });
    });

    it('response with broken rect', () => {
      return new Promise(function(resolve, reject) {
        const FETCH_URL_TO_BLOBSTORE =
            '/blobstore-upload-url?forwardurl=/get-blur-areas';
        const POST_URL = 'postUrlFromBlobstore';

        fetchMock.get(FETCH_URL_TO_BLOBSTORE, POST_URL);

        const RESPONSE = [[{'x': 119, 'y': 54}]];

        fetchMock.post(POST_URL, RESPONSE);

        getBlurAreas(image).then((response) => {
          expect(areRectResponsesEqual(response, [])).to.be.true;
          fetchMock.restore();
          resolve();
        });
      });
    });

    it('normal response with one valid rect', () => {
      return new Promise(function(resolve, reject) {
        const FETCH_URL_TO_BLOBSTORE =
            '/blobstore-upload-url?forwardurl=/get-blur-areas';
        const POST_URL = 'postUrlFromBlobstore';

        fetchMock.get(FETCH_URL_TO_BLOBSTORE, POST_URL);

        const RESPONSE = [[{'x': 10, 'y': 10}, {'x': 20, 'y': 10},
          {'x': 20, 'y': 20}, {'x': 10, 'y': 20}]];
        const EXPECTED =
            [{'leftX': 10, 'topY': 10, 'width': 11, 'height': 11}];
        fetchMock.post(POST_URL, RESPONSE);

        getBlurAreas(image).then((response) => {
          expect(areRectResponsesEqual(response, EXPECTED)).to.be.true;
          fetchMock.restore();
          resolve();
        });
      });
    });
  });

  describe('Rect constructor', () => {
    it('not a rectangle - some other polygon with 4 points', () => {
      const rect = [{'x': 10, 'y': 10}, {'x': 10, 'y': 20},
        {'x': 20, 'y': 10}, {'x': 20, 'y': 111}];
      const image = new Image();

      expect(() => new Rect(rect, image)).to.throw(
          'Point\'s (10, 20) "y" property equals 20 ' +
          'which does not equal this rect\'s ' +
          'minimum (10) or maximum (111) "y" property => ' +
          'this is not a rectangle with sides parallel to x and y axes');
    });

    it('not a rectangle - some other polygon with 4 points. ' +
        'another check triggers', () => {
      const rect = [{'x': 10, 'y': 10}, {'x': 20, 'y': 10},
        {'x': 10, 'y': 20}, {'x': 111, 'y': 20}];
      const image = new Image();

      expect(() => new Rect(rect, image)).to.throw(
          'Point\'s (20, 10) "x" property equals 20 ' +
          'which does not equal this rect\'s ' +
          'minimum (10) or maximum (111) "x" property => ' +
          'this is not a rectangle with sides parallel to x and y axes');
    });

    it('not a rectangle - some other polygon with 5 points', () => {
      const rect = [{'x': 10, 'y': 10}, {'x': 10, 'y': 20}, {'x': 20, 'y': 10},
        {'x': 20, 'y': 10}, {'x': 100, 'y': 100}];
      const image = new Image();

      expect(() => new Rect(rect, image)).to.throw(
          'Rectangle object must contain exactly 4 corner ' +
          'points. This object has 5 points.');
    });

    it('object of not an expected type passed as parameter', () => {
      const someObj = {prop: 'value'};
      const image = new Image();

      expect(() => new Rect(someObj, image)).to.throw(
          'Object passed here is not an Array. ' +
          'It must be an Array of points');
    });

    it('rect is greater than image width', () => {
      const rect = [{'x': 10, 'y': 10}, {'x': 10, 'y': 20},
        {'x': 100, 'y': 10}, {'x': 100, 'y': 20}];
      const image = new Image(10, 200);

      expect(() => new Rect(rect, image)).to.throw(
          'Has x point (x=100) which is greater than ' +
          'image width');
    });

    it('rect is greater than image height', () => {
      const rect = [{'x': 10, 'y': 10}, {'x': 10, 'y': 20},
        {'x': 100, 'y': 10}, {'x': 100, 'y': 20}];
      const image = new Image(100, 1);

      expect(() => new Rect(rect, image)).to.throw(
          'Has y point (y=20) which is greater than ' +
          'image height');
    });

    it('rect has negative top left x point', () => {
      const rect = [{'x': -10, 'y': 10}, {'x': -10, 'y': 20},
        {'x': 20, 'y': 10}, {'x': 20, 'y': 20}];
      const image = new Image();

      expect(() => new Rect(rect, image)).to.throw('Has negative x point: -10');
    });

    it('rect has negative top left y point', () => {
      const rect = [{'x': 10, 'y': -10}, {'x': 10, 'y': 20},
        {'x': 20, 'y': -10}, {'x': 20, 'y': 20}];
      const image = new Image();

      expect(() => new Rect(rect, image)).to.throw('Has negative y point: -10');
    });

    it('first point does not have x property', () => {
      const rect = [{'notxproperty': 10, 'y': 10}, {'x': 10, 'y': 20},
        {'x': 20, 'y': 10}, {'x': 20, 'y': 20}];
      const image = new Image();

      expect(() => new Rect(rect, image)).to.throw(
          'Point {"notxproperty":10,"y":10} ' +
          'does not have "x" property');
    });

    it('second point does not have y property', () => {
      const rect = [{'x': 10, 'y': 10}, {'x': 10, 'notyproperty': 20},
        {'x': 20, 'y': 10}, {'x': 20, 'y': 20}];
      const image = new Image();

      expect(() => new Rect(rect, image)).to.throw(
          'Point {"x":10,"notyproperty":20} ' +
          'does not have "y" property');
    });

    it('first and second points are equal', () => {
      const rect = [{'x': 10, 'y': 10}, {'x': 10, 'y': 10},
        {'x': 20, 'y': 10}, {'x': 20, 'y': 20}];
      const image = new Image();

      expect(() => new Rect(rect, image)).to.throw(
          'Duplicate points : point 1 = ' +
          'point 0 = (10, 10)');
    });

    it('normal rect', () => {
      const rect = [{'x': 10, 'y': 10}, {'x': 10, 'y': 20},
        {'x': 20, 'y': 10}, {'x': 20, 'y': 20}];
      const image = new Image(20, 20);
      const EXPECTED = {'leftX': 10, 'topY': 10, 'width': 11, 'height': 11};

      expect(areRectsEqual(new Rect(rect, image), EXPECTED)).to.be.true;
    });
  });
});
