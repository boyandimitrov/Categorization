db.getSiblingDB("admin").createUser({user:"hashstyle", pwd:"Ha5h5tylE", roles: [ { role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase" ] })