const path = require('path');
const textract = require('textract');

const ALLOWED_EXTENSIONS = [".doc", ".docx", ".txt", ".pdf"];
const WORD_THRESHOLD = 1000;

const allowed_extension = (file_name) => {
    file_name = file_name || "";
    let extension = path.extname(file_name);

    let filtered = ALLOWED_EXTENSIONS.filter(ext => {
        if(ext.localeCompare(extension, undefined, { sensitivity: "accent" }) === 0) {
            return true;
        }
        return false;
    });

    return filtered.length > 0;
}

const textract_data = async(file) => {
    return new Promise(async function(resolve, reject) {
        try {
            
            var start = new Date();
            textract.fromFileWithMimeAndPath(file.mimetype, file.path, async function( error, text ) {
                var end = new Date() - start;
                console.info('Textract execution time: %dms', end)

                if (error) {
                    return reject(error);
                }
                return resolve(text);
            });
        }
        catch (e) {
            return reject(e);
        }
    });
};

const get_content = async(file, data) => {
    if (!allowed_extension(file.originalname)) {
        console.log('this file type is not allowed');
        throw 'This file type is not allowed';
    }
    let result = await textract_data(file);

    let wt = (data || {}).world_threshold || WORD_THRESHOLD;

    return result.substring(0, wt);
}


module.exports = {
    get_content
}