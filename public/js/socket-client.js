document.addEventListener("DOMContentLoaded", () => {
    // Only connect if user is authenticated and io is loaded
    if (typeof io === "undefined" || typeof currentUserId === "undefined") {
        return;
    }

    // Connect to Socket.IO and pass user identity in handshake query
    const socket = io({
        query: { userId: currentUserId }
    });

    console.log("🔌 Socket.IO Client Connected. Registering listeners...");

    // 1. Join listing room if currently viewing a listing detail page
    const listingContainer = document.querySelector("[data-listing-id-show]");
    if (listingContainer) {
        const listingId = listingContainer.getAttribute("data-listing-id-show");
        socket.emit("join-listing-room", listingId);
        console.log(`Joined room for listing: ${listingId}`);
    }

    // 2. Listen for real-time notifications (Friend Requests, Acceptance, Recommendations)
    socket.on("notification", (data) => {
        console.log("🔔 New notification received:", data);
        showBootstrapToast(data.message, data.type);
        updateNotificationDropdown(data);
        animateBell();
    });

    // 3. Listen for direct friend requests
    socket.on("friend-request", (data) => {
        console.log("👤 Live friend request incoming:", data);
        updateIncomingRequestsUI(data);
    });

    // 4. Listen for accepted friend requests
    socket.on("friend-accepted", (data) => {
        console.log("🤝 Live friend request accepted:", data);
        updateFriendsListUI(data.friend);
    });

    // 5. Listen for friends online/offline status updates
    socket.on("online-users", (data) => {
        console.log("🟢 Online status update:", data);
        if (data.onlineFriends) {
            // Bulk update on initial login/connection
            data.onlineFriends.forEach(friendId => {
                setFriendOnlineUI(friendId, true);
            });
        } else if (data.userId && data.status) {
            // Real-time status toggle for a single friend
            setFriendOnlineUI(data.userId, data.status === "online");
        }
    });

    // 6. Listen for listing trust score updates (Listing details page)
    socket.on("trust-score-update", (data) => {
        console.log("❤️ Trust score update:", data);
        const valElem = document.getElementById("trust-score-val");
        if (valElem) {
            valElem.textContent = data.trustScore;
        }
    });

    // 7. Listen for listing recommendation count updates (All Listings page)
    socket.on("recommendation-count", (data) => {
        console.log("📊 Recommendation count update:", data);
        const container = document.querySelector(`.trust-score-container[data-listing-id="${data.listingId}"]`);
        if (container) {
            const valElem = container.querySelector(".trust-score-val");
            if (valElem) {
                valElem.textContent = data.trustScore;
            }
            container.classList.remove("d-none");
        }
    });

    // Initialize AJAX form submission interceptors
    setupAjaxInterceptors();
});

/**
 * Creates and displays a premium Bootstrap Toast notification in the top-right corner.
 * @param {string} message - Notification text.
 * @param {string} type - Event type.
 */
function showBootstrapToast(message, type) {
    const container = document.querySelector(".toast-container");
    if (!container) return;

    let icon = "fa-bell text-secondary";
    if (type === "friend-request") icon = "fa-user-plus text-primary";
    else if (type === "friend-accepted") icon = "fa-user-check text-success";
    else if (type === "recommendation") icon = "fa-star text-warning";

    const toastId = `toast-${Date.now()}`;
    const toastHTML = `
        <div id="${toastId}" class="toast custom-toast border-0" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="5000">
            <div class="toast-header border-0 bg-transparent pb-0">
                <i class="fa-solid ${icon} me-2 fs-6"></i>
                <strong class="me-auto text-dark" style="font-size: 0.85rem;">Alert</strong>
                <small class="text-muted">Just now</small>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body text-dark pt-1 pb-3" style="font-size: 0.9rem;">
                ${message}
            </div>
        </div>
    `;

    container.insertAdjacentHTML("beforeend", toastHTML);
    const toastElem = document.getElementById(toastId);
    
    // Initialize & display the Bootstrap Toast using the client global bootstrap object
    if (typeof bootstrap !== "undefined" && bootstrap.Toast) {
        const bsToast = new bootstrap.Toast(toastElem);
        bsToast.show();
        
        // Remove toast markup from DOM once it fades out
        toastElem.addEventListener("hidden.bs.toast", () => {
            toastElem.remove();
        });
    }
}

/**
 * Updates the navbar notifications bell icon unread badge and dropdown list dynamically.
 * @param {object} data - Notification object.
 */
function updateNotificationDropdown(data) {
    const badge = document.getElementById("notification-badge");
    const list = document.getElementById("notification-list");
    const noMsg = document.getElementById("no-notifications-msg");

    // 1. Update Badge Count
    if (badge) {
        let currentCount = parseInt(badge.textContent.trim()) || 0;
        badge.textContent = currentCount + 1;
        badge.classList.remove("d-none");
    }

    // 2. Remove "No new notifications" placeholders
    if (noMsg) {
        noMsg.remove();
    }

    // 3. Prep notification item markup
    let icon = "fa-bell text-secondary";
    if (data.type === "friend-request") icon = "fa-user-plus text-primary";
    else if (data.type === "friend-accepted") icon = "fa-user-check text-success";
    else if (data.type === "recommendation") icon = "fa-star text-warning";

    const itemHTML = `
        <li class="notification-item border-bottom py-2 px-3 bg-light" data-id="${data._id || ''}">
            <div class="d-flex align-items-start">
                <div class="me-2 mt-1">
                    <i class="fa-solid ${icon}"></i>
                </div>
                <div class="flex-grow-1">
                    <p class="mb-0 text-dark small" style="line-height: 1.4;">${data.message}</p>
                    <small class="text-muted" style="font-size: 0.75rem;">Just now</small>
                </div>
            </div>
        </li>
    `;

    // 4. Prepend to dropdown (right after header)
    if (list) {
        const header = list.querySelector(".dropdown-header");
        if (header) {
            header.insertAdjacentHTML("afterend", itemHTML);
            
            // Add mark-all-read button if it is not already present
            if (!document.getElementById("mark-all-read-btn")) {
                header.insertAdjacentHTML("beforeend", `
                    <button class="btn btn-link p-0 text-decoration-none text-danger small" id="mark-all-read-btn" style="font-size: 0.8rem;">Mark all read</button>
                `);
            }
        } else {
            list.insertAdjacentHTML("beforeend", itemHTML);
        }
    }
}

/**
 * Shakes the notification bell icon to grab visual attention.
 */
function animateBell() {
    const bell = document.getElementById("notification-bell-icon");
    if (!bell) return;
    bell.classList.add("bell-ring");
    setTimeout(() => {
        bell.classList.remove("bell-ring");
    }, 800);
}

/**
 * Toggles a friend's status indicator color and shadow pulse based on status.
 * @param {string} friendId - Target user ID.
 * @param {boolean} isOnline - True for green dot, false for gray dot.
 */
function setFriendOnlineUI(friendId, isOnline) {
    const statusDot = document.getElementById(`status-${friendId}`);
    if (statusDot) {
        if (isOnline) {
            statusDot.style.backgroundColor = "#10b981"; // green
            statusDot.classList.remove("offline");
            statusDot.classList.add("online");
        } else {
            statusDot.style.backgroundColor = "#6c757d"; // gray
            statusDot.classList.remove("online");
            statusDot.classList.add("offline");
        }
    }
}

/**
 * Appends a new friend request card in the incoming requests section dynamically.
 * @param {object} data - Friend request sender details.
 */
function updateIncomingRequestsUI(data) {
    const incomingContainer = document.querySelector(".col-lg-4");
    if (!incomingContainer) return;

    // Remove empty request placeholder
    const emptyState = incomingContainer.querySelector(".text-center.py-5");
    if (emptyState) {
        emptyState.remove();
    }

    let listGroup = incomingContainer.querySelector(".list-group");
    if (!listGroup) {
        const cardBody = incomingContainer.querySelector(".card-body");
        cardBody.innerHTML = `<div class="list-group list-group-flush"></div>`;
        listGroup = cardBody.querySelector(".list-group");
    }

    // Avoid duplicating entry
    const existing = Array.from(listGroup.querySelectorAll("h6")).find(h6 => h6.textContent.trim().includes(`@${data.senderUsername}`));
    if (!existing) {
        const firstChar = data.senderName.charAt(0).toUpperCase();
        const cardHTML = `
            <div class="list-group-item py-3 px-4 border-0">
                <div class="d-flex align-items-center mb-3">
                    <div class="friend-avatar me-3 bg-secondary bg-opacity-10 text-secondary rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                        <span class="font-weight-bold">${firstChar}</span>
                    </div>
                    <div>
                        <h6 class="mb-0 font-weight-bold text-dark">${data.senderName}</h6>
                        <small class="text-muted">@${data.senderUsername} wants to connect</small>
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <form action="/friends/accept/${data.requestId}" method="POST" class="flex-grow-1 m-0">
                        <button type="submit" class="btn btn-sm btn-success w-100 rounded-pill py-2">
                            <i class="fa-solid fa-check me-1"></i>Accept
                        </button>
                    </form>
                    <form action="/friends/reject/${data.requestId}" method="POST" class="flex-grow-1 m-0">
                        <button type="submit" class="btn btn-sm btn-light border w-100 rounded-pill py-2">
                            <i class="fa-solid fa-xmark me-1"></i>Reject
                        </button>
                    </form>
                </div>
            </div>
        `;
        listGroup.insertAdjacentHTML("beforeend", cardHTML);

        // Bind AJAX listeners to new forms
        const lastItem = listGroup.lastElementChild;
        lastItem.querySelectorAll("form").forEach(form => setupAjaxForm(form));
    }
}

/**
 * Appends a newly added friend to the "My Friends" list panel.
 * @param {object} friend - Connected friend object.
 */
function updateFriendsListUI(friend) {
    const friendsContainer = document.querySelector(".col-lg-8");
    if (!friendsContainer) return;

    // Remove empty list state
    const emptyState = friendsContainer.querySelector(".text-center.py-5");
    if (emptyState) {
        emptyState.remove();
    }

    let listGroup = friendsContainer.querySelector(".list-group");
    if (!listGroup) {
        const cardBody = friendsContainer.querySelector(".card-body");
        cardBody.innerHTML = `<div class="list-group list-group-flush"></div>`;
        listGroup = cardBody.querySelector(".list-group");
    }

    // Verify duplication
    if (!listGroup.querySelector(`#status-${friend._id}`)) {
        const firstChar = (friend.name || friend.username).charAt(0).toUpperCase();
        const statusColor = friend.status === "online" ? "#10b981" : "#6c757d";
        const statusClass = friend.status === "online" ? "online" : "offline";

        const itemHTML = `
            <div class="list-group-item py-3 px-4 border-0 d-flex align-items-center justify-content-between hover-bg-light transition">
                <div class="d-flex align-items-center position-relative">
                    <div class="friend-avatar me-3 bg-danger bg-opacity-10 text-danger rounded-circle d-flex align-items-center justify-content-center position-relative" style="width: 48px; height: 48px;">
                        <span class="font-weight-bold" style="font-size: 1.2rem;">${firstChar}</span>
                        <span class="position-absolute bottom-0 end-0 translate-middle-y rounded-circle border border-2 border-white online-indicator ${statusClass}" 
                              id="status-${friend._id}"
                              style="width: 12px; height: 12px; display: inline-block; background-color: ${statusColor}; right: -2px; bottom: -2px;"></span>
                    </div>
                    <div>
                        <h6 class="mb-0 font-weight-bold text-dark">${friend.name || friend.username}</h6>
                        <small class="text-muted">@${friend.username}</small>
                    </div>
                </div>
                <div>
                    <a href="/recommendations?friendId=${friend._id}" class="btn btn-sm btn-outline-dark rounded-pill px-3">
                        <i class="fa-solid fa-star me-1"></i>View Recommendations
                    </a>
                </div>
            </div>
        `;
        listGroup.insertAdjacentHTML("beforeend", itemHTML);

        // Update total friends count badge
        const badge = friendsContainer.querySelector(".badge");
        if (badge) {
            const currentCount = parseInt(badge.textContent.split(" ")[0]) || 0;
            badge.textContent = `${currentCount + 1} Connected`;
        }
    }
}

/**
 * Binds submit interceptors to forms supporting AJAX execution.
 */
function setupAjaxInterceptors() {
    // Intercept accept/reject friend forms
    document.querySelectorAll('form[action^="/friends/accept/"], form[action^="/friends/reject/"]').forEach(form => {
        setupAjaxForm(form);
    });

    // Intercept send friend request forms
    document.querySelectorAll('form[action^="/friends/request/"]').forEach(form => {
        setupAjaxForm(form);
    });

    // Intercept recommendation submissions in detail modal
    const recForm = document.querySelector('#recommendModal form');
    if (recForm) {
        setupRecommendationAjaxForm(recForm);
    }
}

/**
 * Hijacks form submit triggers to run via dynamic AJAX fetch requests.
 * @param {HTMLFormElement} form - The form element.
 */
function setupAjaxForm(form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const action = form.getAttribute("action");
        const method = form.getAttribute("method") || "POST";

        try {
            const response = await fetch(action, {
                method: method,
                headers: {
                    "X-Requested-With": "XMLHttpRequest"
                }
            });

            if (response.ok) {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const resData = await response.json();
                    if (resData.success) {
                        if (action.includes("/friends/accept/")) {
                            updateFriendsListUI(resData.friend);
                            form.closest(".list-group-item").remove();
                            checkEmptyRequestsList();
                        } else if (action.includes("/friends/reject/")) {
                            form.closest(".list-group-item").remove();
                            checkEmptyRequestsList();
                        } else if (action.includes("/friends/request/")) {
                            // On Search page: change "Send request" button to "Request Pending" badge
                            const parent = form.parentElement;
                            if (parent) {
                                parent.innerHTML = `
                                    <span class="badge bg-secondary rounded-pill px-3 py-2">
                                        <i class="fa-solid fa-spinner me-1"></i>Request Pending
                                    </span>
                                `;
                            }
                            showBootstrapToast("Friend request sent successfully!", "friend-request");
                        }
                    }
                } else {
                    window.location.reload();
                }
            }
        } catch (err) {
            console.error("AJAX form submission failure. Falling back to HTTP refresh:", err);
            form.submit();
        }
    });
}

/**
 * Hijacks listing recommendation form to submit via AJAX.
 * @param {HTMLFormElement} form - Recommendation form element.
 */
function setupRecommendationAjaxForm(form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const action = form.getAttribute("action");
        
        // Collect form data
        const formData = new FormData(form);
        const params = new URLSearchParams(formData);

        try {
            const response = await fetch(action, {
                method: "POST",
                body: params,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-Requested-With": "XMLHttpRequest"
                }
            });

            if (response.ok) {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const resData = await response.json();
                    if (resData.success) {
                        // 1. Hide the Bootstrap Modal
                        const modalElem = document.getElementById("recommendModal");
                        if (modalElem) {
                            if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
                                const modalInstance = bootstrap.Modal.getInstance(modalElem);
                                if (modalInstance) modalInstance.hide();
                            }
                        }

                        // Reset recommendation form fields
                        form.reset();

                        // 2. Display success toast alert
                        showBootstrapToast("Recommendation submitted successfully!", "recommendation");

                        // 3. Update the trust score on detail page immediately
                        const valElem = document.getElementById("trust-score-val");
                        if (valElem) {
                            valElem.textContent = resData.trustScore;
                        }
                    }
                } else {
                    window.location.reload();
                }
            }
        } catch (err) {
            console.error("AJAX recommendation submission failure. Falling back to HTTP refresh:", err);
            form.submit();
        }
    });
}

/**
 * Checks if incoming friend requests list is empty, and swaps with empty text markup.
 */
function checkEmptyRequestsList() {
    const container = document.querySelector(".col-lg-4");
    if (container) {
        const listGroup = container.querySelector(".list-group");
        if (listGroup && listGroup.children.length === 0) {
            container.querySelector(".card-body").innerHTML = `
                <div class="text-center py-5 text-muted">
                    <div class="mb-3" style="font-size: 2.5rem; color: #cbd5e0;">
                        <i class="fa-solid fa-bell-slash"></i>
                    </div>
                    <p class="small text-muted mb-0">No pending requests</p>
                </div>
            `;
        }
    }
}

/**
 * Global click event listener for "Mark all read" notifications button.
 */
document.addEventListener("click", async (e) => {
    if (e.target && e.target.id === "mark-all-read-btn") {
        e.preventDefault();
        try {
            const response = await fetch("/notifications/mark-all-read", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            });
            const resData = await response.json();
            if (resData.success) {
                // Clear the unread badge
                const badge = document.getElementById("notification-badge");
                if (badge) {
                    badge.textContent = "0";
                    badge.classList.add("d-none");
                }
                
                // Clear bg-light (unread) background indicators
                document.querySelectorAll(".notification-item").forEach(item => {
                    item.classList.remove("bg-light");
                });

                // Remove the mark all read button
                e.target.remove();
            }
        } catch (error) {
            console.error("Failed to mark notifications read:", error);
        }
    }
});
