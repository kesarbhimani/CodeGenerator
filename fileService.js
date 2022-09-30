let HTMLParser = require('node-html-parser');
let fs = require('fs');
let express = require('express');
let app = express();
let path = require('path');
let { exec } = require('child_process');

app.set('view engine', 'ejs');

const mkdir = (dir) => {
    try {
        fs.mkdirSync(dir);
    } catch (e) {
        console.log(e);
    }
}

const cmd = (command) => {
    try {
        exec(command);
    } catch (e) {
        console.log(e);
    }
}

let fileData = fs.readFile('htmlForm/StudentRegistration.html', 'utf-8', (err, res) => {
    if (err) console.log(err);
    let data = HTMLParser.parse(res);
    let formElement = data.getElementsByTagName('form');
    let inputElement = data.getElementsByTagName('input');
    let selectElement = data.getElementsByTagName('select');

    let dropdown = {}
    for (let element of selectElement) {
        let context = element.rawAttributes.name;
        dropdown[context] = [];
        for (let childNode of element.childNodes) {
            if (childNode.nodeType != 1) continue;
            dropdown[context].push(childNode.rawAttributes.value);
        }
    }
    //adding radio buttons and checkox to constant file
    let constRadioChk = {};
    for (let element of inputElement) {
        let context = element.rawAttributes;
        if (context.type == "radio" || context.type == "checkbox") {
            let name = context.name;
            if (constRadioChk[name] === undefined) constRadioChk[name] = [context.value];
            else constRadioChk[name].push(context.value)
            console.log(constRadioChk)
        }
    }
    let formName = formElement[0].rawAttributes.name;
    mkdir(path.join(__dirname, formName));
    cmd(`cd ${formName} && npm init -y && npm i express mongoose`);
    mkdir(`${formName}/models`);
    mkdir(`${formName}/constant`);
    mkdir(`${formName}/controller`);
    mkdir(`${formName}/routes`);
    let constants = Object.entries(dropdown)
    app.render('constantTemplate', { data: constants, formName: formName, constRadioChk: constRadioChk }, (err, res) => {
        if (err) return console.log(err)
        fs.writeFileSync(`${formName}/constant/` + `${formName}.js`, res);
    });

    let fields = {};
    for (let element of inputElement) {
        const attribute = element.rawAttributes;

        if (attribute.name && attribute.type) {
            let datatype;
            if (attribute.type == 'radio' || attribute.type == 'checkbox') {
                if (!fields[attribute.name]) {
                    fields[attribute.name] = ['String', [attribute.value]];
                } else {
                    fields[attribute.name][1] = [...fields[attribute.name][1], attribute.value];
                }
            } else if (attribute.type == 'text' || attribute.type == 'password' || attribute.type == 'email') {
                datatype = 'String';
                fields[attribute.name] = datatype;
            }
            else if (attribute.type == 'number') {
                datatype = 'Number';
                fields[attribute.name] = datatype;
            }
            else if (attribute.type == 'date') {
                datatype = 'Date';
                fields[attribute.name] = datatype;
            }
        }
    }
    app.render('routesTemplate', { attribute: formName }, (err, res) => {
        if (err) return console.log(err)
        fs.writeFileSync(`${formName}/routes/` + `${formName}Route.js`, res);
    });

    app.render('controllerTemplate', { attribute: formName }, (err, res) => {
        if (err) return console.log(err)
        fs.writeFileSync(`${formName}/controller/` + `${formName}Controller.js`, res);
    });

    let foreignKey = undefined;
    Object.keys(dropdown).map((k) => {

        if (dropdown[k].length >= 10) {
            if (foreignKey === undefined) foreignKey = [k];
            else foreignKey.push(k);

            app.render('relationModelTemplate', { attribute: k, values: dropdown[k] }, (err, res) => {
                if (err) return console.log(err)
                fs.writeFileSync(`${formName}/models/` + `${k}.js`, res);
            });

            app.render('relationControllerTemplate', { attribute: k }, (err, res) => {
                if (err) return console.log(err)
                fs.writeFileSync(`${formName}/controller/` + `${k}Controller.js`, res);
            });

            app.render('relationRouteTemplate', { attribute: k }, (err, res) => {
                if (err) return console.log(err)
                fs.writeFileSync(`${formName}/routes/` + `${k}Route.js`, res);
            });
        }
        else {
            fields[k] = ['String', dropdown[k]];
        }
    });

    app.render('modelTemplate', { attribute: formName, schema: fields, foreignKey: foreignKey }, (err, res) => {
        if (err) return console.log(err)
        fs.writeFileSync(`${formName}/models/` + `${formName}` + '.js', res);
    });

    app.render('appTemplate', { attribute: formName, routes: foreignKey }, (err, res) => {
        if (err) return console.log(err)
        fs.writeFileSync(`${formName}/` + `app.js`, res);
    });
});