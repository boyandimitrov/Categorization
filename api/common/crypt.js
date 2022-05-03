const crypto = require("crypto");

module.exports = {
    sha1: function(val) {
        return crypto.createHash("sha1").update(val).digest("hex");
    }
};
