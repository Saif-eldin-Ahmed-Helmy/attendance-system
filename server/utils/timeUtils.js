const moment = require("moment");

function getMilliSeconds() {
    return moment.now();
}

function formatTime(milliSeconds, format) {
    return moment(milliSeconds).format(format);
}

module.exports = { getMilliSeconds, formatTime };