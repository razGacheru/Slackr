/**
 * Given a js file object representing a jpg or png image, such as one taken
 * from a html file input element, return a promise which resolves to the file
 * data as a data url.
 * More info:
 *   https://developer.mozilla.org/en-US/docs/Web/API/File
 *   https://developer.mozilla.org/en-US/docs/Web/API/FileReader
 *   https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
 *
 * Example Usage:
 *   const file = document.querySelector('input[type="file"]').files[0];
 *   console.log(fileToDataUrl(file));
 * @param {File} file The file to be read.
 * @return {Promise<string>} Promise which resolves to the file as a data url.
 */
export function fileToDataUrl(file) {
  const validFileTypes = ["image/jpeg", "image/png", "image/jpg"];
  const valid = validFileTypes.find((type) => type === file.type);
  // Bad data, let's walk away.
  if (!valid) {
    throw Error("provided file is not a png, jpg or jpeg image.");
  }

  const reader = new FileReader();
  const dataUrlPromise = new Promise((resolve, reject) => {
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
  });
  reader.readAsDataURL(file);
  return dataUrlPromise;
}

export const global = {
  token: null,
  userId: null,
  currChannelId: null,
};

export const getUserDetails = (userId) => {
  return apiGet(`user/${userId}`, "").then((res) => res);
};

// fetch messages
export const fetchAllMessages = (channelId) => {
  let total = 0;
  const messages = [];

  const fetchMessages = (start) => {
    return apiGet(`message/${channelId}`, `start=${start}`).then((res) => {
      if (res.messages.length === 0) {
        return { total, messages };
      } else {
        total += res.messages.length;
        messages.push(...res.messages);
        return fetchMessages(start + res.messages.length);
      }
    });
  };

  return fetchMessages(0);
};

export const getChannelReacts = (messageId) => {
  return new Promise((resolve, reject) => {
    fetchAllMessages(global.currChannelId).then((res) => {
      if (res.error) {
        reject(res);
      } else {
        const index = res.messages.findIndex((el) => el.id === messageId);
        if (index !== null) {
          resolve(res.messages[index].reacts);
        }
      }
    });
  });
};

export const inviteUser = (userId) => {
  apiPost(`channel/${global.currChannelId}/invite`, {
    userId: userId,
  })
    .then((res) => {
      modalPopup("User invite success", `Successfully added`);
    })
    .catch((e) => modalPopup("User invite failed", e));
};

export // Function to populate user list in the modal
function populateUserList() {
  const channelDetails = apiGet(`channel/${global.currChannelId}`, {}).then(
    (res) => res
  );

  Promise.all([channelDetails]).then((channelDetails) => {
    getAllUsers().then((users) => {
      // Create an array of promises to fetch user details
      const userDetailPromises = users.map((user) =>
        getUserDetails(user.id).then((res) => res.name)
      );

      // Wait for all user detail promises to be resolved
      Promise.all(userDetailPromises)
        .then((userNames) => {
          userNames.sort((a, b) => a.localeCompare(b));

          userList.innerHTML = "";
          users.forEach((user, index) => {
            const li = document.createElement("li");
            if (user.id === global.userId) {
              return;
            }

            if (channelDetails[0].members.includes(user.id)) {
              li.innerHTML = `<input type="checkbox" value="${user.id}" disabled title="Already a member"> ${userNames[index]} `;
            } else {
              li.innerHTML = `<input type="checkbox" value="${user.id}"> ${userNames[index]}`;
            }
            userList.appendChild(li);
          });
        })
        .catch((error) => {
          // Handle errors if any of the promises are rejected
          console.error("Error fetching user details:", error);
        });
    });
  });
}

const getAllUsers = () => {
  return apiGet(`user`, "")
    .then((res) => {
      // remove user from return result
      const userIndex = res.users.findIndex(
        (user) => user.id === global.userId
      );
      res.users.splice(userIndex, 1);
      return res.users;
    })
    .catch((e) => modalPopup("Get all users failed", e));
};

export const createElement = (tag) => document.createElement(tag);

// POST Request
export const apiPost = (path, body) => {
  return new Promise((resolve, reject) => {
    fetch(`http://localhost:5005/${path}`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-type": "application/json",
        Authorization: `Bearer ${global.token}`,
      },
    })
      .then((response) => response.json())
      .then((body) => {
        if (body.error) {
          reject(body.error);
        } else {
          resolve(body);
        }
      });
  });
};

// Get request
export const apiGet = (path, queryString) => {
  return new Promise((resolve, reject) => {
    fetch("http://localhost:5005/" + path + "?" + queryString, {
      method: "GET",
      headers: {
        "Content-type": "application/json",
        Authorization: `Bearer ${global.token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data);
        }
      });
  });
};

// PUT request
export const apiPut = (path, body) => {
  return new Promise((resolve, reject) => {
    fetch(`http://localhost:5005/${path}`, {
      method: "PUT",
      body: JSON.stringify(body),
      headers: {
        "Content-type": "application/json",
        Authorization: `Bearer ${global.token}`,
      },
    })
      .then((response) => response.json())
      .then((body) => {
        if (body.error) {
          reject(body.error);
        } else {
          resolve(body);
        }
      });
  });
};

// DELETE request
export const apiDelete = (path, queryString) => {
  return new Promise((resolve, reject) => {
    fetch("http://localhost:5005/" + path + "?" + queryString, {
      method: "DELETE",
      headers: {
        "Content-type": "application/json",
        Authorization: `Bearer ${global.token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data);
        }
      });
  });
};

export // get pinned message
const getPinnedMessages = (channelId) => {
  return fetchAllMessages(channelId).then((res) => {
    const pinnedMessages = [];
    res.messages.forEach((msg) => {
      if (msg.pinned) {
        pinnedMessages.push(msg.message);
      }
    });
    return pinnedMessages;
  });
};

export // Modal for showing alerts
const modalPopup = (errHeaderText, errBodyText) => {
  const errHeader = document.getElementById("error-header");
  const errBody = document.getElementById("error-body");
  errHeader.innerText = errHeaderText;
  errBody.innerText = errBodyText;
  document.getElementById("toggle-error-modal").click();
};

// display and hide pages
export const displayPage = (pageName) => {
  document
    .querySelectorAll(".hidden")
    .forEach((page) => (page.style.display = "none"));
  document.getElementById(pageName).style.display = "block";
};
