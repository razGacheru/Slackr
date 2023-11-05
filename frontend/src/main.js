import { BACKEND_PORT } from "./config.js";
import {
  fileToDataUrl,
  apiGet,
  apiPost,
  apiPut,
  global,
  apiDelete,
  createElement,
  getUserDetails,
  populateUserList,
  inviteUser,
  getChannelReacts,
  getPinnedMessages,
  fetchAllMessages,
  modalPopup,
  displayPage,
} from "./helpers.js";

/* ============= DECLARATIONS =============
  ==========================================
*/

const channelMessages = document.getElementById("channel-messages");
const channelsList = document.getElementById("chat-channels-list");

global.token = localStorage.getItem("token");
global.userId = parseInt(localStorage.getItem("userId"));

// internal links handle
document.querySelectorAll(".redirect-link").forEach((link) =>
  link.addEventListener("click", (e) => {
    const page = e.target.getAttribute("redirect-link");
    displayPage(page);
  })
);

// Login and register buttons
document.getElementById("login-button").addEventListener("click", (e) => {
  const loginEmail = document.getElementById("login-email").value;
  const loginPassword = document.getElementById("login-password").value;

  if (!loginEmail || !loginPassword) {
    modalPopup("", "Please fill in all the fields");
    return;
  }

  apiPost("auth/login", {
    email: loginEmail,
    password: loginPassword,
  })
    .then((body) => {
      const { token, userId } = body;
      global.token = token;
      global.userId = userId;
      localStorage.setItem("token", token);
      localStorage.setItem("userId", userId);
      getUserDetails(userId).then((res) => {
        const welcomeUser = document.getElementById("welcome-user");
        welcomeUser.innerText = `Welcome to Slackr, ${res.name}. It's nice to have you here!`;
      });

      displayPage("user-dashboard");
      displayChannels();
    })
    .catch((err) => {
      modalPopup("Login Failed", err);
    });
});

document
  .getElementById("registration-button")
  .addEventListener("click", (e) => {
    const registrationEmail =
      document.getElementById("registration-email").value;
    const registrationName = document.getElementById("registration-name").value;
    const registrationPassword = document.getElementById(
      "registration-password"
    ).value;
    const registrationConfirmPassword = document.getElementById(
      "registration-confirm-password"
    ).value;

    if (registrationPassword !== registrationConfirmPassword) {
      modalPopup("Please try again", "Passwords do not match.");
      return;
    }

    apiPost("auth/register", {
      email: registrationEmail,
      password: registrationPassword,
      name: registrationName,
    })
      .then((body) => {
        modalPopup("Registration successful", "Please enter login details");
        displayPage("login-page");
      })
      .catch((err) => {
        modalPopup("Registration Failed", err);
      });
  });

// =========CHANNEL CONTAINER ============
//=========================================
const channelName = document.getElementById("channel-name");
const channelDescription = document.getElementById("channel-description");
const channelPrivacy = document.getElementById("channel-privacy");
const channelTimeStamp = document.getElementById("channel-timestamp");
const channelCreator = document.getElementById("channel-creator");

document.getElementById("edit-channel-button").addEventListener("click", () => {
  apiGet(`channel/${global.currChannelId}`, {}).then((res) => {
    document.getElementById("updated-channel-name").value = res.name;
    document.getElementById("updated-channel-description").value =
      res.description;
    document.getElementById("update-channel-modal").click();
  });
});

// Update message

const handleEditMessage = (e) => {
  e.stopImmediatePropagation();
  document.getElementById("edit-message-modal").click();
  document
    .getElementById("edit-message-submit-button")
    .addEventListener("click", (e) => {
      const messageId = document.getElementById("edit-message-messageId").value;
      const updatedMessage = document.getElementById(
        "edit-message-message"
      ).value;
      if (updatedMessage.trim() === "") {
        modalPopup("Edit message failed", "Empty string invalid");
        return;
      }
      updateChannelMessage(global.currChannelId, messageId, updatedMessage);
    });
};

const expandChannel = (channel, channelId) => {
  global.currChannelId = channelId;
  channelName.innerText = channel.name;
  channelDescription.innerText = `Description: ${channel.description}`;
  channelPrivacy.innerText = channel.privacy === true ? "Private" : "Public";
  channelTimeStamp.innerText = `Creation Date: ${new Date(channel.createdAt)
    .toString()
    .slice(0, 16)}`;
  channelCreator.innerText = `Creator: ${channel.creator}`;

  showChannelMessages(channelId);
  showChannelPinnedMessages(channelId);
};

const displayChannels = () => {
  channelsList.textContent = "";
  apiGet("channel", "").then((res) => {
    res.channels
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((channel) => {
        addChannelToList(channel);
      });
    displayPage("user-dashboard");
  });
};

// logout
document.getElementById("logout-button").addEventListener("click", (e) => {
  apiPost("auth/logout", {})
    .then(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      displayPage("login-page");
    })
    .catch((msg) => {
      modalPopup("Logout failed", err);
    });
});

// create new channel
const newChannelName = document.getElementById("new-channel-name");
const newChannelDescription = document.getElementById(
  "new-channel-description"
);
const newChannelPrivacy = document.getElementById("new-channel-privacy");

document
  .getElementById("create-channel-button")
  .addEventListener("click", () => {
    document.getElementById("toggle-add-channel-modal").click();
  });

document.getElementById("new-channel-submit").addEventListener("click", () => {
  const channelsList = document.getElementById("chat-channels-list");
  channelsList.textContent = "";
  let channelName = newChannelName.value;
  if (channelName === "") {
    modalPopup("Create channel failed", "Channel name input field required!");
    return;
  }
  let channelDescription = newChannelDescription.value;
  let channelPrivacy = newChannelPrivacy.value === "private" ? true : false;
  apiPost("channel", {
    name: channelName,
    private: channelPrivacy,
    description: channelDescription,
  })
    .then((id) => {
      modalPopup(
        `Create channel (${channelName}) success`,
        "Invite your friends and chat with them!"
      );
      newChannelName.value = "";
      newChannelDescription.value = "";
      displayChannels();
    })
    .catch((err) => modalPopup("Create channel failed", err));
});

// leave channel
document
  .getElementById("leave-channel-button")
  .addEventListener("click", () => {
    apiPost(`channel/${global.currChannelId}/leave`, {})
      .then((res) => {
        modalPopup("Leave channel success", "");
        showJoinChannelOption(global.currChannelId);
      })
      .catch((e) => modalPopup("Leave channel failed", e));
  });

// update channel details
document
  .getElementById("update-channel-submit")
  .addEventListener("click", (e) => {
    const updatedName = document.getElementById("updated-channel-name").value;
    const updatedDescription = document.getElementById(
      "updated-channel-description"
    ).value;
    apiPut(`channel/${global.currChannelId}`, {
      name: updatedName,
      description: updatedDescription,
    })
      .then((res) => {
        document.getElementById(
          "channel-description"
        ).innerText = `Description: ${updatedDescription}`;
        document.getElementById("channel-name").innerText = updatedName;
        displayChannels();
      })
      .catch((e) => modalPopup("Edit channel failed", e));
  });

// show pinned messages
const showChannelPinnedMessages = (channelId) => {
  const pinnedMessages = document.getElementById("channel-pinned-messages");
  pinnedMessages.textContent = "";
  getPinnedMessages(channelId).then((res) => {
    if (res.length === 0) {
      const small = createElement("small");
      small.innerText = "Pinned messages: none";
      pinnedMessages.appendChild(small);
    } else {
      pinnedMessages.innerText = "Pinned messages:";
      res.forEach((msg) => {
        if (msg !== "") {
          let pin = document.createElement("small");
          pin.style.display = "block";
          pin.innerText = `📌${msg}`;
          pinnedMessages.appendChild(pin);
        }
      });
    }
  });
};

// View channel messages
export const showChannelMessages = (channelId) => {
  channelMessages.textContent = "";
  document.getElementById("chat-header").style.display = "block";
  thumbnailsSrc = [];
  fetchAllMessages(global.currChannelId)
    .then((res) => {
      if (res.messages.length === 0) {
        channelMessages.innerText = "This channel has 0 messages";
        return;
      }

      res.messages
        .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
        .forEach((msg) => {
          // container for the message
          const li = createElement("li");
          const div1 = createElement("div");
          const span = createElement("span");
          const div2 = createElement("div");
          const img = createElement("img");
          const small = createElement("small");

          getUserDetails(msg.sender).then((res) => {
            if (res.image === null || res.image === "") {
              img.setAttribute(
                "src",
                "https://t4.ftcdn.net/jpg/03/46/93/61/360_F_346936114_RaxE6OQogebgAWTalE1myseY1Hbb5qPM.jpg"
              );
            } else {
              img.setAttribute("src", res.image);
            }
            img.style.width = "35px";
            img.style.height = "35px";
            channelMessages.appendChild(li);
            span.innerText = res.name + " ";
            span.style.cursor = "pointer";
            span.addEventListener("click", () => showUserDetails(res));
            const elem = document.getElementById("chat-history");
            elem.scrollTop = elem.scrollHeight;
          });

          img.setAttribute("alt", "user-avatar");

          if (msg.message !== "") {
            const message = createElement("div");
            message.innerText = msg.message;
            div2.appendChild(message);
            div2.appendChild(small);
          } else {
            const imgMessage = createElement("img");
            imgMessage.setAttribute("src", msg.image);
            imgMessage.style.width = "300px";
            imgMessage.style.height = "200px";
            imgMessage.style.display = "block";
            div2.appendChild(imgMessage);
            div2.appendChild(small);
            imgMessage.addEventListener("click", () => viewImages(msg.image));
          }

          small.innerText =
            msg.editedAt === null
              ? `✓ ${new Date(msg.sentAt).toString().slice(0, 21)}`
              : `Edited ✓ ${new Date(msg.editedAt).toString().slice(0, 21)}`;
          li.classList.add("clearfix");
          div1.classList.add("message-data");
          span.classList.add("message-data-time");
          div2.classList.add("message");
          div2.classList.add(
            msg.sender === global.userId ? "my-message" : "other-message"
          );
          if (msg.sender !== global.userId) {
            div1.classList.add("text-right");
            div2.classList.add("float-right");
            div1.appendChild(span);
            div1.appendChild(img);
            div1.appendChild(createElement("br"));
          } else {
            div1.appendChild(img);
            div1.appendChild(span);
            div1.appendChild(createElement("br"));
          }

          li.appendChild(div1);
          li.appendChild(div2);

          // REACTS
          const reacts = createElement("ul");
          reacts.classList.add("reactions-list");

          let numOfThumbUps = 0;
          let numOfThumbDowns = 0;
          let numOfHearts = 0;
          getChannelReacts(msg.id).then((res) => {
            res.forEach((el) => {
              if (el.react === "thumb-up") {
                numOfThumbUps++;
                console.log(numOfThumbUps);
              } else if (el.react === "thumb-down") {
                numOfThumbDowns++;
              } else {
                numOfHearts++;
              }
            });
            reactThumbUpButton.innerText = `👍(${numOfThumbUps})`;
            reacts.appendChild(reactThumbUp);
            reactThumbDownButton.innerText = `👎(${numOfThumbDowns})`;
            reacts.appendChild(reactThumbDown);
            reactHeartButton.innerText = `❤️(${numOfHearts})`;
            reacts.appendChild(reactHeart);
          });

          // thumb up
          const reactThumbUp = createElement("li");
          const reactThumbUpButton = createElement("small");
          reactThumbUpButton.style.cursor = "pointer";
          reactThumbUpButton.style.padding = "5px";
          reactThumbUp.appendChild(reactThumbUpButton);

          // thumb down
          const reactThumbDown = createElement("li");
          const reactThumbDownButton = createElement("small");
          reactThumbDownButton.style.cursor = "pointer";
          reactThumbDownButton.style.padding = "5px";
          reactThumbDown.appendChild(reactThumbDownButton);

          // thumb down
          const reactHeart = createElement("li");
          const reactHeartButton = createElement("small");
          reactHeartButton.style.cursor = "pointer";
          reactHeartButton.style.padding = "5px";
          reactHeart.appendChild(reactHeartButton);

          reactThumbDown.addEventListener("click", (e) => {
            e.stopImmediatePropagation();
            reactToMessage(
              msg.id,
              "thumb-down",
              reactThumbDownButton,
              "👎",
              numOfThumbDowns
            );
          });
          reactThumbUp.addEventListener("click", (e) => {
            e.stopImmediatePropagation();
            reactToMessage(
              msg.id,
              "thumb-up",
              reactThumbUpButton,
              "👍",
              numOfThumbUps
            );
          });
          reactHeart.addEventListener("click", (e) => {
            e.stopImmediatePropagation();
            reactToMessage(
              msg.id,
              "heart",
              reactHeartButton,
              "❤️",
              numOfHearts
            );
          });
          // let message;
          const controllers = createElement("div");
          controllers.style.display = "flex";
          if (msg.message !== "") {
            // Pin message
            let pinningMessage = createElement("li");
            let pinMessageButton = createElement("button");
            pinMessageButton.innerText = msg.pinned ? "Unpin" : "Pin";
            pinMessageButton.style.marginRight = "5px";
            pinningMessage.appendChild(pinMessageButton);
            pinMessageButton.addEventListener("click", () =>
              pinMessage(global.currChannelId, msg.id, pinMessageButton)
            );
            controllers.appendChild(pinningMessage);
          } else {
            thumbnailsSrc.push(msg.image);
          }

          // if user owns the message, show delete button
          if (msg.sender === global.userId) {
            // show delete message option
            let deleteMessage = createElement("li");
            let deleteMessageButton = createElement("button");
            deleteMessageButton.innerText = "Delete";
            deleteMessageButton.style.marginRight = "5px";
            deleteMessage.appendChild(deleteMessageButton);
            deleteMessageButton.addEventListener("click", (e) =>
              deleteChannelMessage(global.currChannelId, msg.id, li)
            );
            // show edit message option
            if (msg.message) {
              let editMessage = createElement("li");
              let editMessageButton = createElement("button");
              editMessageButton.innerText = "Edit";
              editMessageButton.style.marginRight = "5px";
              editMessage.appendChild(editMessageButton);
              editMessageButton.setAttribute("messageId", msg.id);

              editMessageButton.addEventListener("click", (e) => {
                e.stopImmediatePropagation();
                document.getElementById("edit-message-messageId").value =
                  msg.id;
                handleEditMessage(e);
              });
              controllers.appendChild(editMessage);
            }

            controllers.appendChild(deleteMessage);
          }

          div2.appendChild(reacts);
          div2.appendChild(controllers);
        });
    })
    .catch((e) => modalPopup("Edit message failed", e));
};

// Send message
function sendMessage() {
  const messageText = document
    .getElementById("channel-send-message")
    .value.trim();

  if (messageText === "") {
    modalPopup("Send message failed", "Message cannot be empty!");
    return;
  }

  apiPost(`message/${global.currChannelId}`, {
    message: messageText,
    image: "",
  })
    .then((res) => {
      document.getElementById("channel-send-message").value = "";
      const li = createElement("li");
      const div1 = createElement("div");
      const span = createElement("span");
      const div2 = createElement("div");
      const img = createElement("img");
      const small = createElement("small");

      getUserDetails(global.userId).then((res) => {
        const message = createElement("div");
        message.innerText = messageText;
        div2.appendChild(message);
        div2.appendChild(small);

        if (res.image === null || res.image === "") {
          img.setAttribute(
            "src",
            "https://t4.ftcdn.net/jpg/03/46/93/61/360_F_346936114_RaxE6OQogebgAWTalE1myseY1Hbb5qPM.jpg"
          );
        } else {
          img.setAttribute("src", res.image);
        }
        img.style.width = "35px";
        img.style.height = "35px";
        span.innerText = res.name;
        channelMessages.appendChild(li);
        span.addEventListener("click", () => showUserDetails(res));
        const elem = document.getElementById("chat-history");
        elem.scrollTop = elem.scrollHeight;
      });

      img.setAttribute("alt", "user-avatar");

      small.innerText = `✓ ${new Date().toString().slice(0, 25)}`;
      li.classList.add("clearfix");
      div1.classList.add("message-data");
      span.classList.add("message-data-time");
      div2.classList.add("message");
      div2.classList.add("my-message");

      div1.appendChild(img);
      div1.appendChild(span);
      div1.appendChild(createElement("br"));

      li.appendChild(div1);
      li.appendChild(div2);
    })
    .catch((e) => modalPopup("Send message failed", e));
}

// Attach event listener to the send button
document
  .getElementById("channel-send-message-button")
  .addEventListener("click", () => sendMessage());

// Delete message
const deleteChannelMessage = (channelId, messageId, li) => {
  apiDelete(`message/${channelId}/${messageId}`, "")
    .then((res) => channelMessages.removeChild(li))
    .catch((e) => modalPopup("Delete message failed", e));
};

// React on message
const reactToMessage = (
  messageId,
  reaction,
  button,
  emoji,
  currNumOfReactions
) => {
  apiPost(`message/react/${global.currChannelId}/${messageId}`, {
    react: reaction,
  })
    .then((res) => {
      button.innerText = `${emoji} (${currNumOfReactions + 1})`;
      button.style.background = "skyblue";
    })
    .catch((e) => {
      if (
        e ===
        "This message already contains a react of this type from this user"
      ) {
        unreactToMessage(
          messageId,
          reaction,
          button,
          emoji,
          currNumOfReactions + 1
        );
      } else {
        modalPopup("Message react failed", e);
      }
    });
};

// unreact to message
const unreactToMessage = (
  messageId,
  reaction,
  button,
  emoji,
  currNumOfReactions
) => {
  apiPost(`message/unreact/${global.currChannelId}/${messageId}`, {
    react: reaction,
  })
    .then((res) => {
      button.innerText = `${emoji} (${currNumOfReactions - 1})`;
      button.style.background = "none";
    })
    .catch((e) => console.log(e));
};

// pin message
const pinMessage = (channelId, messageId, pinMessageButton) => {
  apiPost(`message/pin/${channelId}/${messageId}`, {})
    .then((res) => {
      pinMessageButton.innerText = "Unpin";
      showChannelPinnedMessages(channelId);
    })
    .catch((e) => {
      if (e === "This message is already pinned") {
        unpinMessage(channelId, messageId, pinMessageButton);
      } else {
        modalPopup("Pin message failed", e);
      }
    });
};

// unpin message
const unpinMessage = (channelId, messageId, pinMessageButton) => {
  apiPost(`message/unpin/${channelId}/${messageId}`, {})
    .then((res) => {
      showChannelPinnedMessages(channelId);
      pinMessageButton.innerText = "Pin";
    })
    .catch((e) => modalPopup("Unpin message failed", e));
};

const openModalBtn = document.getElementById("openModalBtn");
const userList = document.getElementById("userList");
const addUsersBtn = document.getElementById("addUsersBtn");

// Event listeners
openModalBtn.addEventListener("click", () => {
  populateUserList();
  document.getElementById("invite-user-modal").click();
});

addUsersBtn.addEventListener("click", () => {
  const selectedUsers = Array.from(
    userList.querySelectorAll("input:checked")
  ).map((input) => parseInt(input.value));
  // Perform the logic to add selected users to the channel
  selectedUsers.forEach((userId) => inviteUser(userId));
});

// Viewing and editing user's own profile
const profilePhoto = document.getElementById("edit-profile-photo");
const profileName = document.getElementById("edit-profile-name");
const profileNewEmail = document.getElementById("edit-profile-email");
const profileBio = document.getElementById("edit-profile-bio");
const newPassword = document.getElementById("edit-profile-new-password");
let updatedProfilePhoto = null;
let profileExistingEmail = null;

// show edit profile form
document.getElementById("edit-profile-expand").addEventListener("click", () => {
  getUserDetails(global.userId).then((res) => {
    document.getElementById("update-profile-modal").click();
    updatedProfilePhoto = res.image;
    profileExistingEmail = res.email;
    if (updatedProfilePhoto) {
      document
        .getElementById("edit-profile-display-photo")
        .setAttribute("src", updatedProfilePhoto);
    }

    profileName.value = res.name;
    profileNewEmail.value = res.email;
    profileBio.value = res.bio;
    newPassword.value = "";
  });
});

document
  .getElementById("edit-profile-submit")
  .addEventListener("click", (e) => {
    e.preventDefault();
    // if user did not put new password then the existing password remains
    if (newPassword.value.length !== 0 && newPassword.value.trim() === "") {
      modalPopup(
        "Invalid password",
        "Length must be greater than 0 and cannot be all white spaces"
      );
      return;
    }
    updateUserProfile();
  });

const updateUserProfile = () => {
  const requestBody = {
    name: profileName.value,
    bio: profileBio.value,
    image: updatedProfilePhoto,
  };

  if (newPassword.value) {
    requestBody.password = newPassword.value;
  }

  if (
    profileNewEmail.value.length !== 0 &&
    profileNewEmail.value.trim() === ""
  ) {
    modalPopup(
      "Change detail failed",
      "Email length must be > 0 and must contain other character other than whitespace"
    );
    return;
  }
  if (profileNewEmail.value !== profileExistingEmail) {
    requestBody.email === profileNewEmail.value;
  }

  apiPut("user", requestBody)
    .then(() => {
      location.reload();
    })
    .catch((error) => {
      modalPopup("Error updating user profile:", error);
    });
};

profilePhoto.addEventListener("change", () => {
  fileToDataUrl(profilePhoto.files[0]).then((res) => {
    document
      .getElementById("edit-profile-display-photo")
      .setAttribute("src", res);
    updatedProfilePhoto = res;
  });
});

document.querySelectorAll(".toggle-password").forEach((toggler) => {
  toggler.addEventListener("click", (event) => {
    const targetSelector = event.target.getAttribute("data-target");
    const inputField = document.querySelector(targetSelector);
    inputField.type = inputField.type === "password" ? "text" : "password";

    event.target.classList.toggle("bi-eye");
  });
});

// Sending photos in channels
const channelSendPhotoInput = document.getElementById("channel-send-photo");
document
  .getElementById("channel-send-photo-button")
  .addEventListener("click", () => {
    channelSendPhotoInput.click();
  });
channelSendPhotoInput.addEventListener("change", () => {
  fileToDataUrl(channelSendPhotoInput.files[0]).then((res) => sendPhoto(res));
});

const sendPhoto = (image) => {
  apiPost(`message/${global.currChannelId}`, {
    message: "",
    image: image,
  })
    .then((res) => {
      const li = createElement("li");
      const div1 = createElement("div");
      const span = createElement("span");
      const div2 = createElement("div");
      const img = createElement("img");
      const small = createElement("small");
      thumbnailsSrc.push(image);

      getUserDetails(global.userId).then((res) => {
        if (res.image === null || res.image === "") {
          img.setAttribute(
            "src",
            "https://t4.ftcdn.net/jpg/03/46/93/61/360_F_346936114_RaxE6OQogebgAWTalE1myseY1Hbb5qPM.jpg"
          );
        } else {
          img.setAttribute("src", res.image);
        }
        img.style.width = "35px";
        img.style.height = "35px";
        channelMessages.appendChild(li);
        span.innerText = res.name;
        span.addEventListener("click", () => showUserDetails(res));
        const elem = document.getElementById("chat-history");
        elem.scrollTop = elem.scrollHeight;
      });

      img.setAttribute("alt", "user-avatar");

      div1.appendChild(img);
      div1.appendChild(span);
      div1.appendChild(createElement("br"));

      const imgMessage = createElement("img");
      imgMessage.setAttribute("src", image);
      imgMessage.style.width = "300px";
      imgMessage.style.height = "200px";
      imgMessage.style.display = "block";
      div2.appendChild(imgMessage);
      div2.appendChild(small);

      small.innerText = `✓ ${new Date().toString().slice(0, 25)}`;
      li.classList.add("clearfix");
      div1.classList.add("message-data");
      span.classList.add("message-data-time");
      div2.classList.add("message");
      div2.classList.add("my-message");
      div1.appendChild(img);
      div1.appendChild(span);
      div1.appendChild(createElement("br"));

      li.appendChild(div1);
      li.appendChild(div2);
      div2.addEventListener("click", () => viewImages(image));
    })
    .catch((e) => modalPopup(e));
};

// view images
let currentViewedImageIndex = 0;
let thumbnailsSrc = [];

const viewImages = (imageUrl) => {
  document.getElementById("view-image-modal").click();
  currentViewedImageIndex = thumbnailsSrc.findIndex((url) => url === imageUrl);
  displayImage(currentViewedImageIndex);
};

document
  .getElementById("prev-image-button")
  .addEventListener("click", function () {
    currentViewedImageIndex =
      (currentViewedImageIndex - 1 + thumbnailsSrc.length) %
      thumbnailsSrc.length;
    displayImage(currentViewedImageIndex);
  });

// Next button click event
document
  .getElementById("next-image-button")
  .addEventListener("click", function () {
    currentViewedImageIndex =
      (currentViewedImageIndex + 1) % thumbnailsSrc.length;
    displayImage(currentViewedImageIndex);
  });

function displayImage(index) {
  const currentViewedImage = document.getElementById("thumbnail-modal-image");
  currentViewedImage.src = thumbnailsSrc[index];
  currentViewedImageIndex = index;
}

document.body.addEventListener("click", (event) => {
  if (event.target.classList.contains("channel-list")) {
    const allChannelListElements = document.querySelectorAll(".channel-list");
    allChannelListElements.forEach((element) => {
      element.classList.remove("active");
    });

    event.target.classList.add("active");
  } else {
    const allChannelListElements = document.querySelectorAll(".channel-list");
    allChannelListElements.forEach((element) => {
      element.classList.remove("active");
    });
  }
});

const addChannelToList = (channel) => {
  const li = createElement("li");
  const img = createElement("img");
  const div1 = createElement("div");
  const div2 = createElement("div");
  const div3 = createElement("div");

  li.classList.add("clearfix");
  li.classList.add("channel-list");
  div1.classList.add("about");
  div2.classList.add("name");
  div3.classList.add("status");

  div2.innerText = channel.name;
  div3.innerText = channel.private ? "🔒 Private" : "🌎 Public";

  div1.appendChild(div2);
  div1.appendChild(div3);
  li.appendChild(img);
  li.appendChild(div1);

  img.setAttribute(
    "src",
    "https://previews.123rf.com/images/abscent/abscent1709/abscent170900113/86079830-people-avatar-icons-with-dialog-speech-bubbles-male-and-female-faces-avatars-discussion-group-people.jpg"
  );
  img.setAttribute("alt", "channel-avatar");

  channelsList.append(li);

  li.addEventListener("click", () => {
    apiGet(`channel/${channel.id}`, "")
      .then((res) => expandChannel(res, channel.id))
      .catch((err) => {
        document.getElementById("channel-pinned-messages").textContent = "";
        showJoinChannelOption(channel.id);
      });
  });

  li.addEventListener("focus", () => {
    li.classList.add("active");
  });
};

const updateChannelMessage = (
  channelId,
  messageId,
  updatedMessage,
  updatedImage
) => {
  apiPut(`message/${channelId}/${messageId}`, {
    message: updatedMessage,
    image: updatedImage,
  })
    .then((res) => {
      showChannelMessages(channelId);
    })
    .catch((e) => modalPopup("Update message failed", e));
};

const showJoinChannelOption = (channelId) => {
  global.currChannelId = channelId;
  document.getElementById("chat-header").style.display = "none";
  const channelMessages = document.getElementById("channel-messages");
  channelMessages.textContent = "";

  const p = createElement("p");
  const button = createElement("button");

  p.innerText =
    'You are not a member of this channel. Click "JOIN" to see channel details';
  button.setAttribute("id", "join-channel-button");
  button.innerText = "JOIN";

  channelMessages.appendChild(p);
  channelMessages.appendChild(button);

  button.addEventListener("click", () => {
    apiPost(`channel/${global.currChannelId}/join`, {})
      .then((res) => {
        modalPopup(
          "Join channel success",
          "Welcome to the group chat - The community warmly welcomes you and looks forward to engaging in interesting and enriching conversations together 🌟"
        );
        showChannelMessages(global.currChannelId);
      })
      .catch((e) => modalPopup("Join channel failed", e));
  });
};

document.getElementById("view-profile-nav").addEventListener("click", () => {
  apiGet(`user/${global.userId}`, "").then((res) => showUserDetails(res));
});

const showUserDetails = (user) => {
  document
    .getElementById("view-user-profile-avatar")
    .setAttribute(
      "src",
      user.image
        ? user.image
        : "https://t4.ftcdn.net/jpg/03/46/93/61/360_F_346936114_RaxE6OQogebgAWTalE1myseY1Hbb5qPM.jpg"
    );
  document.getElementById("view-user-profile-name").innerText = user.name;
  document.getElementById("view-user-profile-email").innerText = user.email;
  document.getElementById("view-user-profile-bio").innerText = user.bio;

  document.getElementById("view-user-profile-modal").click();
};

if (global.token) {
  displayChannels();
} else {
  displayPage("login-page");
}
