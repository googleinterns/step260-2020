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

describe('filling method', function() {
  const testCases = [
    {
      'description': 'jpg image',
      'inputImageUrl': 'test-files/64kb.jpg',
      'expectedImageUrl': 'filled/test1.png',
      'rects': [
        {
          'leftX': 0,
          'topY': 0,
          'width': 100,
          'height': 100,
        },
        {
          'leftX': 100,
          'topY': 100,
          'width': 50,
          'height': 10,
        },
      ],
    },
    {
      'description': 'png image',
      'inputImageUrl': 'test-files/537kb.png',
      'expectedImageUrl': 'filled/test2.png',
      'rects': [
        {
          'leftX': 0,
          'topY': 0,
          'width': 100,
          'height': 100,
        },
        {
          'leftX': 100,
          'topY': 100,
          'width': 50,
          'height': 10,
        },
      ],
    },
    {
      'description': 'intersecting rectangles',
      'inputImageUrl': 'test-files/64kb.jpg',
      'expectedImageUrl': 'filled/test3.png',
      'rects': [
        {
          'leftX': 100,
          'topY': 100,
          'width': 400,
          'height': 100,
        },
        {
          'leftX': 30,
          'topY': 30,
          'width': 200,
          'height': 300,
        },
      ],
    },
    {
      'description': 'one big rectangle',
      'inputImageUrl': 'test-files/64kb.jpg',
      'expectedImageUrl': 'filled/test4.png',
      'rects': [
        {
          'leftX': 0,
          'topY': 0,
          'width': 615,
          'height': 370,
        },
      ],
    },
  ];

  /**
   * Function to generate tests from test cases above.
   * @param {Object} testCase
   */
  function makeTest(testCase) {
    it(testCase.description, function() {
      return new Promise(async function(resolve, reject) {
        // get ImageObject object to pass to getImageWithFilledAreas
        // function as parameter
        const inputImage = new ImageObject(testCase.inputImageUrl,
            await getImageFromPath(testCase.inputImageUrl), 'somename',
            'sometype', testCase.rects);

        // get Blob to compare with the output of
        // getImageWithFilledAreas function
        const expectedImage = await getFileBlob(testCase.expectedImageUrl);

        getImageWithFilledAreas(inputImage).object.toBlob(
            async function(filledImage) {
              resemble(expectedImage)
                  .compareTo(filledImage)
                  .onComplete(function(data) {
                    // expected and blurred images must be 100% equal.
                    expect((parseInt(data.misMatchPercentage))).to.equal(0);
                    resolve();
                  });
            });
      });
    });
  }

  for (const testCase of testCases) {
    makeTest(testCase);
  }
});
