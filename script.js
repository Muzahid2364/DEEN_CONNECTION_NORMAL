// ======================================================
// DEEN CONNECT FRONTEND API
// ======================================================

const GAS_API_URL =
    "https://script.google.com/macros/s/AKfycbxjYr-YPnqrSmiPaN0RPwrxxgPtCin7NlqqZKIsUGws5U9f5KWWMi9irLRgk7Sj9StK/exec";


async function api(action, data = {}) {

    const payload = new URLSearchParams();

    payload.append(
        "payload",
        JSON.stringify({
            action: action,
            ...data
        })
    );

    const response = await fetch(
        GAS_API_URL,
        {
            method: "POST",
            body: payload
        }
    );

    if (!response.ok) {
        throw new Error(
            "API Error: " + response.status
        );
    }

    return await response.json();
}


// ======================================================
// VARIABLES
// ======================================================

var bannerData = null;

var waitingPollInterval = null;

var currentPendingRoom = null;

var currentPendingName = null;


// ======================================================
// SPLASH
// ======================================================

window.addEventListener(
    "DOMContentLoaded",
    function () {

        setTimeout(
            function () {

                var splash =
                    document.getElementById(
                        "splash-screen"
                    );

                if (splash) {

                    splash.classList.add(
                        "hide-splash"
                    );
                }

            },
            12000
        );
    }
);


// ======================================================
// PAGE LOAD
// ======================================================

window.onload = function () {

    checkBannerStatus();

    setInterval(
        checkBannerStatus,
        3000
    );
};


// ======================================================
// SIDEBAR
// ======================================================

function toggleSidebar() {

    document
        .getElementById("sidebar")
        .classList.toggle("active");

    document
        .getElementById("sidebar-overlay")
        .classList.toggle("active");
}


// ======================================================
// TOAST
// ======================================================

function showToast(
    msg,
    type = "success"
) {

    var toast =
        document.getElementById("toast");

    document.getElementById(
        "toast-msg"
    ).innerText = msg;

    toast.className =
        "show " +
        (
            type === "error"
                ? "toast-error"
                : "toast-success"
        );

    setTimeout(
        function () {
            toast.className = "";
        },
        3500
    );
}


// ======================================================
// GENERAL
// ======================================================

function scrollToSec(id) {

    var element =
        document.getElementById(id);

    if (element) {

        element.scrollIntoView({
            behavior: "smooth"
        });
    }
}


function openModal(id) {

    document
        .getElementById(id)
        .classList.add("open");
}


function closeModal(id) {

    document
        .getElementById(id)
        .classList.remove("open");
}


// ======================================================
// USER EXPANDABLE BOX
// ======================================================

function toggleUserExpandableBox() {

    var box =
        document.getElementById(
            "user-expandable-box"
        );

    box.style.display =
        box.style.display === "block"
            ? "none"
            : "block";
}


// ======================================================
// CHECK BANNER
// ======================================================

async function checkBannerStatus() {

    try {

        var data =
            await api(
                "getLatestMeetingStatusInfo"
            );

        var banner =
            document.getElementById(
                "notice-banner"
            );

        if (
            data &&
            (
                data.status === "WAITING" ||
                data.status === "ACTIVE"
            )
        ) {

            bannerData = data;

            var text =
                data.status === "WAITING"
                    ? `Meeting বানানো হয়েছে [${data.room}] (Host অপেক্ষায়)`
                    : `Meeting চলছে [${data.room}]`;

            document.getElementById(
                "notice-text"
            ).innerText = text;

            banner.style.display =
                "block";

        } else {

            bannerData = null;

            banner.style.display =
                "none";
        }

    } catch (error) {

        console.error(
            "Banner API error:",
            error
        );
    }
}


// ======================================================
// CREATE MEETING
// ======================================================

async function handleCreateMeeting(
    autoJoin
) {

    var u =
        document.getElementById(
            "host-user"
        ).value.trim();

    var p =
        document.getElementById(
            "host-pass"
        ).value.trim();

    var room =
        document.getElementById(
            "create-room"
        ).value.trim();

    var pass =
        document.getElementById(
            "create-password"
        ).value.trim();

    var name =
        document.getElementById(
            "create-name"
        ).value.trim();


    if (
        !u ||
        !p ||
        !room ||
        !name
    ) {

        return showToast(
            "সবগুলো ঘর পূরণ করুন",
            "error"
        );
    }


    try {

        var ok =
            await api(
                "checkHostLogin",
                {
                    username: u,
                    password: p
                }
            );


        if (!ok) {

            return showToast(
                "ভুল হোস্ট ইউজারনেম/পাসওয়ার্ড!",
                "error"
            );
        }


        var res =
            await api(
                "createMeeting",
                {
                    roomName: room,
                    pass: pass,
                    hostUser: u,
                    autoStart: autoJoin
                }
            );


        if (res.success) {

            if (autoJoin) {

                openJitsiWindow(
                    res.secretRoom,
                    name,
                    true
                );

            } else {

                showToast(
                    "মিটিং তৈরি করা হয়েছে! হোস্ট প্রবেশ করলে শুরু হবে।",
                    "success"
                );

                checkBannerStatus();
            }

        } else {

            showToast(
                res.msg ||
                "মিটিং তৈরি করা যায়নি",
                "error"
            );
        }

    } catch (error) {

        console.error(error);

        showToast(
            "Server connection failed!",
            "error"
        );
    }
}


// ======================================================
// JOIN MEETING
// ======================================================

async function joinMeetingProcess() {

    var room =
        String(
            document.getElementById(
                "join-room"
            ).value
        ).trim();

    var pass =
        String(
            document.getElementById(
                "join-password"
            ).value
        ).trim();

    var name =
        String(
            document.getElementById(
                "join-name"
            ).value
        ).trim();


    if (!room || !name) {

        return showToast(
            "রুমের নাম এবং আপনার নাম দিন",
            "error"
        );
    }


    try {

        var data =
            await api(
                "getActiveMeetingByName",
                {
                    roomName: room
                }
            );


        if (
            data.status === "INACTIVE" ||
            !data.room
        ) {

            return showToast(
                "এই নামে কোনো সক্রিয় মিটিং পাওয়া যায়নি!",
                "error"
            );
        }


        var sheetPass =
            String(
                data.pass || ""
            ).trim();


        if (
            sheetPass !== "" &&
            sheetPass !== pass
        ) {

            return showToast(
                "ভুল রুম পাসওয়ার্ড!",
                "error"
            );
        }


        if (
            data.status === "WAITING"
        ) {

            startWaitingProcess(
                room,
                name
            );

        } else {

            openJitsiWindow(
                data.secretRoom,
                name,
                false
            );
        }

    } catch (error) {

        console.error(error);

        showToast(
            "Server connection failed!",
            "error"
        );
    }
}


// ======================================================
// WAITING PROCESS
// ======================================================

function startWaitingProcess(
    roomName,
    displayName
) {

    currentPendingRoom =
        roomName;

    currentPendingName =
        displayName;


    openModal(
        "zoom-waiting-modal"
    );


    if (waitingPollInterval) {

        clearInterval(
            waitingPollInterval
        );
    }


    waitingPollInterval =
        setInterval(
            async function () {

                try {

                    var data =
                        await api(
                            "getActiveMeetingByName",
                            {
                                roomName:
                                    currentPendingRoom
                            }
                        );


                    if (
                        data &&
                        data.status === "ACTIVE"
                    ) {

                        clearInterval(
                            waitingPollInterval
                        );

                        closeModal(
                            "zoom-waiting-modal"
                        );

                        showToast(
                            "হোস্ট জয়েন করেছেন! প্রবেশ করানো হচ্ছে...",
                            "success"
                        );

                        openJitsiWindow(
                            data.secretRoom,
                            currentPendingName,
                            false
                        );
                    }

                } catch (error) {

                    console.error(
                        error
                    );
                }

            },
            2000
        );
}


// ======================================================
// CANCEL WAITING
// ======================================================

function cancelWaiting() {

    if (waitingPollInterval) {

        clearInterval(
            waitingPollInterval
        );
    }

    closeModal(
        "zoom-waiting-modal"
    );

    showToast(
        "অপেক্ষা বাতিল করা হয়েছে",
        "error"
    );
}


// ======================================================
// HOST JOIN MODAL
// ======================================================

function openHostJoinModal() {

    if (!bannerData) {

        return showToast(
            "কোনো সক্রিয় মিটিং নেই",
            "error"
        );
    }

    openModal(
        "host-login-modal"
    );
}


// ======================================================
// HOST BANNER JOIN
// ======================================================

async function submitHostBannerJoin() {

    var u =
        document.getElementById(
            "banner-host-u"
        ).value.trim();

    var p =
        document.getElementById(
            "banner-host-p"
        ).value.trim();

    var name =
        document.getElementById(
            "banner-host-name"
        ).value.trim();


    if (
        !u ||
        !p ||
        !name
    ) {

        return showToast(
            "সবগুলো ঘর পূরণ করুন",
            "error"
        );
    }


    if (!bannerData) {

        return showToast(
            "কোনো সক্রিয় মিটিং পাওয়া যায়নি",
            "error"
        );
    }


    try {

        var res =
            await api(
                "hostStartMeeting",
                {
                    roomName:
                        bannerData.room,

                    username: u,

                    password: p
                }
            );


        if (res.success) {

            closeModal(
                "host-login-modal"
            );

            openJitsiWindow(
                res.secretRoom,
                name,
                true
            );

            checkBannerStatus();

        } else {

            showToast(
                res.msg,
                "error"
            );
        }

    } catch (error) {

        console.error(error);

        showToast(
            "Server connection failed!",
            "error"
        );
    }
}


// ======================================================
// EXPANDABLE USER JOIN
// ======================================================

function executeExpandableUserJoin() {

    if (!bannerData) {

        return showToast(
            "কোনো মিটিং সক্রিয় নেই",
            "error"
        );
    }


    var pass =
        String(
            document.getElementById(
                "exp-user-pass"
            ).value
        ).trim();

    var name =
        String(
            document.getElementById(
                "exp-user-name"
            ).value
        ).trim();


    if (!name) {

        return showToast(
            "আপনার নাম লিখুন",
            "error"
        );
    }


    document.getElementById(
        "join-room"
    ).value =
        bannerData.room;


    document.getElementById(
        "join-password"
    ).value =
        pass;


    document.getElementById(
        "join-name"
    ).value =
        name;


    joinMeetingProcess();
}


// ======================================================
// JITSI / ELEMENT
// ======================================================

function openJitsiWindow(
    secretRoom,
    displayName,
    isHost = false
) {

    var baseUrl =
        "https://meet.element.io/" +
        secretRoom;

    var fullUrl =
        baseUrl +
        "#userInfo.displayName=" +
        encodeURIComponent(
            '"' +
            displayName +
            '"'
        );


    window.open(
        fullUrl,
        "_blank",
        "width=1000,height=700,scrollbars=yes,resizable=yes"
    );
}


// ======================================================
// OWNER LOGIN
// ======================================================

async function openOwnerModal() {

    var u =
        document.getElementById(
            "owner-u"
        ).value.trim();

    var p =
        document.getElementById(
            "owner-p"
        ).value.trim();


    if (!u || !p) {

        return showToast(
            "Owner লগইন তথ্য দিন",
            "error"
        );
    }


    try {

        var ok =
            await api(
                "checkOwnerLogin",
                {
                    username: u,
                    password: p
                }
            );


        if (ok) {

            openModal(
                "owner-modal"
            );

            loadHostList();

            loadActiveMeetingDetails();

        } else {

            showToast(
                "ভুল Owner তথ্য!",
                "error"
            );
        }

    } catch (error) {

        console.error(error);

        showToast(
            "Server connection failed!",
            "error"
        );
    }
}


// ======================================================
// OWNER MEETING DETAILS
// ======================================================

async function loadActiveMeetingDetails() {

    var container =
        document.getElementById(
            "meeting-details-content"
        );


    try {

        var data =
            await api(
                "getOwnerFullMeetingDetails"
            );


        if (!data) {

            container.innerHTML =
                "<p style='color:#ef4444;font-weight:bold;'>বর্তমানে কোনো সক্রিয় মিটিং চলছে না।</p>";

            return;
        }


        var hostStatus =
            data.isHostPresent

                ? "<span style='color:#10b981;font-weight:bold;'>উপস্থিত (ACTIVE)</span>"

                : "<span style='color:#ef4444;font-weight:bold;'>অনুপস্থিত (WAITING)</span>";


        container.innerHTML = `

            <p>
                <b>📌 রুম নাম:</b>
                ${escapeHTML(data.roomName)}
            </p>

            <p>
                <b>👤 হোস্ট নাম:</b>
                ${escapeHTML(data.hostName)}
            </p>

            <p>
                <b>🔑 রুম পাসওয়ার্ড:</b>
                ${escapeHTML(data.password)}
            </p>

            <p>
                <b>⚡ মিটিং স্ট্যাটাস:</b>
                ${hostStatus}
            </p>

            <p>
                <b>🕒 শুরুর সময়:</b>
                ${escapeHTML(data.createdAt)}
            </p>

            <p>
                <b>⏱️ মোট সময়:</b>
                ${escapeHTML(data.duration)}
            </p>

            <p>
                <b>🔗 Secret ID:</b>
                ${escapeHTML(data.secretRoom)}
            </p>

            <button
                onclick="deleteMeetingByOwnerProcess()"
                style="
                    background:#ef4444;
                    color:#fff;
                    border:none;
                    padding:10px;
                    border-radius:8px;
                    margin-top:12px;
                    cursor:pointer;
                    font-weight:bold;
                    width:100%;
                "
            >
                ❌ মিটিং ফোর্স ক্লোজ / বন্ধ করুন
            </button>

        `;

    } catch (error) {

        console.error(error);

        container.innerHTML =
            "<p style='color:#ef4444;'>Server connection failed.</p>";
    }
}


// ======================================================
// OWNER CREDENTIAL CHANGE
// ======================================================

async function submitChangeOwnerCredentials() {

    var currentU =
        document.getElementById(
            "owner-u"
        ).value.trim();

    var currentP =
        document.getElementById(
            "owner-p"
        ).value.trim();

    var newU =
        document.getElementById(
            "change-owner-u"
        ).value.trim();

    var newP =
        document.getElementById(
            "change-owner-p"
        ).value.trim();


    if (!newU || !newP) {

        return showToast(
            "নতুন ইউজারনেম ও পাসওয়ার্ড লিখুন",
            "error"
        );
    }


    try {

        var res =
            await api(
                "updateOwnerCredentials",
                {
                    currentU:
                        currentU,

                    currentP:
                        currentP,

                    newU:
                        newU,

                    newP:
                        newP
                }
            );


        showToast(
            res.msg,
            res.success
                ? "success"
                : "error"
        );


        if (res.success) {

            document.getElementById(
                "owner-u"
            ).value = newU;

            document.getElementById(
                "owner-p"
            ).value = newP;

            document.getElementById(
                "change-owner-u"
            ).value = "";

            document.getElementById(
                "change-owner-p"
            ).value = "";
        }

    } catch (error) {

        console.error(error);

        showToast(
            "Server connection failed!",
            "error"
        );
    }
}


// ======================================================
// FORCE CLOSE
// ======================================================

async function deleteMeetingByOwnerProcess() {

    if (
        !confirm(
            "আপনি কি নিশ্চিত যে এই মিটিংটি বন্ধ করবেন?"
        )
    ) {

        return;
    }


    try {

        var res =
            await api(
                "deleteMeetingByOwner"
            );


        showToast(
            res.msg,
            res.success
                ? "success"
                : "error"
        );


        if (res.success) {

            loadActiveMeetingDetails();

            checkBannerStatus();
        }

    } catch (error) {

        console.error(error);

        showToast(
            "Server connection failed!",
            "error"
        );
    }
}


// ======================================================
// HOST LIST
// ======================================================

async function loadHostList() {

    try {

        var list =
            await api(
                "getHostList"
            );


        var container =
            document.getElementById(
                "host-list-container"
            );


        container.innerHTML = "";


        if (
            !list ||
            list.length === 0
        ) {

            container.innerHTML =
                '<div style="color:var(--text-muted);font-size:12px;">কোনো হোস্ট পাওয়া যায়নি</div>';

            return;
        }


        list.forEach(
            function (item) {

                container.innerHTML += `

                    <div
                        style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            background:rgba(255,255,255,0.05);
                            padding:8px 12px;
                            margin-bottom:6px;
                            border-radius:10px;
                            font-size:13px;
                        "
                    >

                        <span>
                            👤
                            ${escapeHTML(item.username)}
                        </span>

                        <button
                            onclick="removeHostProcess(${Number(item.rowIndex)})"
                            style="
                                background:#ef4444;
                                color:#fff;
                                border:none;
                                padding:4px 8px;
                                border-radius:6px;
                                cursor:pointer;
                                font-size:11px;
                            "
                        >
                            Delete
                        </button>

                    </div>
                `;
            }
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Host list load failed!",
            "error"
        );
    }
}


// ======================================================
// CREATE HOST
// ======================================================

async function createNewHost() {

    var u =
        document.getElementById(
            "new-host-u"
        ).value.trim();

    var p =
        document.getElementById(
            "new-host-p"
        ).value.trim();


    if (!u || !p) {

        return showToast(
            "ইউজারনেম এবং পাসওয়ার্ড দিন",
            "error"
        );
    }


    try {

        var res =
            await api(
                "addHostByOwner",
                {
                    username: u,
                    password: p
                }
            );


        showToast(
            res.msg,
            res.success
                ? "success"
                : "error"
        );


        if (res.success) {

            document.getElementById(
                "new-host-u"
            ).value = "";

            document.getElementById(
                "new-host-p"
            ).value = "";

            loadHostList();
        }

    } catch (error) {

        console.error(error);

        showToast(
            "Server connection failed!",
            "error"
        );
    }
}


// ======================================================
// REMOVE HOST
// ======================================================

async function removeHostProcess(
    rowIndex
) {

    if (
        !confirm(
            "আপনি কি নিশ্চিত যে এই হোস্টকে ডিলিট করতে চান?"
        )
    ) {

        return;
    }


    try {

        var res =
            await api(
                "deleteHostByOwner",
                {
                    rowIndex:
                        rowIndex
                }
            );


        showToast(
            res.msg,
            res.success
                ? "success"
                : "error"
        );


        if (res.success) {

            loadHostList();
        }

    } catch (error) {

        console.error(error);

        showToast(
            "Server connection failed!",
            "error"
        );
    }
}


// ======================================================
// MANUAL
// ======================================================

function showManualPage() {

    document.querySelector(
        ".container"
    ).style.display = "none";

    document.getElementById(
        "manual-page"
    ).style.display = "block";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function hideManualPage() {

    document.getElementById(
        "manual-page"
    ).style.display = "none";

    document.querySelector(
        ".container"
    ).style.display = "block";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ======================================================
// BASIC HTML ESCAPE
// ======================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}