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

describe('getPhotosToSave()', () => {
  loadBlurredPhoto = async (photo) => {
    const testObject = {
      url: "test",
    };
    return testObject;
  }

  /**
   * @param {Array<photo>} arr1 
   * @param {Array<photo>} arr2 
   * @return {Boolean}
   */
  function areArraysOfPhotosEqual(arr1, arr2) {
    if (arr1.length != arr2.length) {
      return false;
    }
    for (let i = 0; i < arr1.length; ++i) {
      if(arr1[i].id !== arr2[i].id) {
        return false;
      }
    }
    return true;
  }

  it('General test', async () => {
    const photos = [
      {
        id: 1,
        sizeInKB: 80,
        value: 0.2,
      },
      {
        id: 2,
        sizeInKB: 150,
        value: 0.5,
      },
      {
        id: 3,
        sizeInKB: 210,
        value: 0.8,
      },
      {
        id: 4,
        sizeInKB: 130,
        value: 0.3,
      },
    ];
    const actual = await getPhotosToSave(photos);
    const expected = [
      {
        id: 3,
      },
      {
        id: 2,
      },
    ];

    expect(areArraysOfPhotosEqual(actual, expected)).to.be.true;
  });

  it('All photos bigger', async () => {
    const photos = [
      {
        id: 1,
        sizeInKB: 500,
        value: 0.2,
      },
      {
        id: 2,
        sizeInKB: 500,
        value: 0.5,
      },
      {
        id: 3,
        sizeInKB: 500,
        value: 0.8,
      },
      {
        id: 4,
        sizeInKB: 500,
        value: 0.3,
      },
    ];
    const actual = await getPhotosToSave(photos);
    const expected = [];

    expect(areArraysOfPhotosEqual(actual, expected)).to.be.true;
  });

  it('Cache all photos', async () => {
    const photos = [
      {
        id: 1,
        sizeInKB: 10,
        value: 0.2,
      },
      {
        id: 2,
        sizeInKB: 10,
        value: 0.5,
      },
      {
        id: 3,
        sizeInKB: 10,
        value: 0.8,
      },
      {
        id: 4,
        sizeInKB: 10,
        value: 0.3,
      },
    ];
    const actual = await getPhotosToSave(photos);
    const expected = [
      {
        id: 4,
      },
      {
        id: 3,
      },
      {
        id: 2,
      },
      {
        id: 1,
      },
    ];

    expect(areArraysOfPhotosEqual(actual, expected)).to.be.true;
  });
});
