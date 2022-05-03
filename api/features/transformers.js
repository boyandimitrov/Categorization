const line_reader = require('line-reader');
const natural = require('natural');

const utils = require("../common/utils");

let file_nomenclature = {};
let compiled_regex = {};

let replace_from_file_first = async(title, cfg) => 
    new Promise((resolve, reject) => {
        line_reader.open(cfg.file_path, function(err, reader) {
            if (err) {
                console.log(err);
                return reject(err);
            }
        });
        try {
            file_nomenclature[cfg.file_path] = [];
            line_reader.eachLine(cfg.file_path, function(line, last) {
                file_nomenclature[cfg.file_path].push(line);

                if ( !compiled_regex[line] ) {
                    compiled_regex[line] = new RegExp(`\\b${line}\\b`, 'g');
                }
                const re = compiled_regex[line];
                title = title.replace(re, cfg.feature);
                if ( last ) {
                    return resolve(title);
                }
            }); 
        }
        catch (e) {
            delete file_nomenclature[cfg.file_path];
            console.error(e);
            return reject(e);
        }
    });

let replace_from_file_async = async (title, cfg) => {
    if ( file_nomenclature[cfg.file_path]) {
        let lines = file_nomenclature[cfg.file_path];
        lines.forEach(line => {
            if ( !compiled_regex[line] ) {
                compiled_regex[line] = new RegExp(`\\b${line}\\b`, 'g');
            }

            const re = compiled_regex[line];
            title = title.replace(re, cfg.feature);
        })

        return title;
    }

    return await replace_from_file_first(title, cfg);
};

let enrich_from_file_first = async(title, cfg) =>
    new Promise((resolve, reject) => {
        line_reader.open(cfg.file_path, function(err, reader) {
            if (err) {
                console.error(err);
                return reject(err);
            }
        });
        file_nomenclature[cfg.file_path] = [];
        let is_added = false;
        line_reader.eachLine(cfg.file_path, function(line, last) {
            file_nomenclature[cfg.file_path].push(line);

            let parts = title.split(" ");
            parts.forEach(part => {
                if ( part.toUpperCase() === line.toUpperCase() ) {
                    if ( !is_added ) {
                        is_added = true;
                        title += ` ${cfg.feature}`
                    }
                }
            })
            if ( last ) {
                return resolve(title);
            }
        });       
    });

let enrich_from_file_async = async(title, cfg) => {
    if ( file_nomenclature[cfg.file_path]) {
        let lines = file_nomenclature[cfg.file_path];
        lines.forEach(line => {
            let parts = title.split(" ");
            for(let i=0; i< parts.length; i++) {
                if ( parts[i].toUpperCase() === line.toUpperCase() ) {
                    title += ` ${cfg.feature}`
                    return title;
                }
            }
        });   
        
        return title;
    }

    return await enrich_from_file_first(title, cfg);
};

let replace_list = (title, cfg) => {
    if ( !Array.isArray(cfg.matches) ) {
        throw "Wrong input in replace_list transformer"
    }

    let parts = title.split(" ");
    let found = false;
    for (let i=0; i< cfg.matches.length; i++ ) {
        let match = cfg.matches[i];
        let intersection = utils.intersect(parts, match.from);
        for ( let i=0; i < intersection.length; i++ ) {
            let idx = parts.indexOf(intersection[i]);

            if ( match.feature === "" ) {
                parts.splice(idx, 1);
            }
            else {
                parts[idx] = match.feature;
            }
            found = true;
        }
    }

    if ( !found && cfg.default ) {
        parts.push(cfg.default);
    }

    return parts.join(" ");
}

let concatenate = (title, cfg) => {
    if ( !Array.isArray(cfg.matches) ) {
        throw "Wrong input in concatenate transformer"
    }

    for (let i=0; i< cfg.matches.length; i++ ) {
        let match = cfg.matches[i];
        const re = new RegExp(match.regex, 'g');
        title = title.replace(re, match.feature);
    }

    return title;
}

let replace = (title, cfg) => {
    if ( !Array.isArray(cfg.matches) ) {
        throw "Wrong input in replace transformer"
    }

    for (let i=0; i< cfg.matches.length; i++ ) {
        let match = cfg.matches[i];
        const re = new RegExp(match.regex, 'g');
        title = title.replace(re, match.feature);
    }

    return title;
}

let category_enrichment = (title, cfg, algo_config) => {
    const categories = algo_config.categories;
    if ( !categories && !categories.length) {
        return title;
    }

    for ( let i=0; i< categories.length; i++ ) {
        let cat = categories[i].toUpperCase();

        if ( !compiled_regex[cat] ) {
            compiled_regex[cat] = new RegExp(`${cat}`);
        }
        const re = compiled_regex[cat];

        if ( re.test(title)) {
            title += ` #${cat.replace(/ /g, '')}`
        }
    }

    return title;
}

let enrich_list = (title, cfg) => {
    if ( !Array.isArray(cfg.matches) ) {
        throw "Wrong input in enrich_list transformer"
    }

    let parts = title.split(" ");
    for (let i=0; i< cfg.matches.length; i++ ) {
        let match = cfg.matches[i];
        let intersection = utils.intersect(parts, match.from);
        if (intersection.length) {
            parts.push(match.feature);
            break;
        }
    }

    return parts.join(" ");
}

module.exports = {
    to_upper : async function(title) {
        return title.toUpperCase();
    },
    split : async function(title, cfg) {
        let re = new RegExp(cfg.regex);
        return title.split(re).join(' ').replace(/\s+/g,' ').trim();
    },
    category_enrichment : async(title, cfg, algo_config) => {
        return await category_enrichment(title, cfg, algo_config);
    },
    stemmer : async function(title) {
        return title.split(" ").map(word => natural.PorterStemmer.stem(word).toUpperCase()).join(" ");
    },
    replacement_lists :  async function(title, cfg) {
        return replace_list(title, cfg);
    },
    enrichment_lists :  async function(title, cfg) {
        return enrich_list(title, cfg);
    },
    replace : async function(title, cfg) {
        return replace(title, cfg);
    },
    replace_from_file : async function(title, cfg) {
        return await replace_from_file_async(title, cfg);
    },
    enrich_from_file : async function(title, cfg) {
        return await enrich_from_file_async(title, cfg);
    },
    concatenate : function(title, cfg) {
        return concatenate(title, cfg);
    }
}