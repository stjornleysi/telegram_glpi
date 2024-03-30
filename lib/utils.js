const he = require('he');
const html = require('html-to-text');
const fs = require('fs');

const conf = JSON.parse(fs.readFileSync(__dirname + "/../data/conf.json"));
const glpiUrl = conf.glpiConfig.apiurl.replace("apirest.php", "");

exports.htmlToText = async(text) => {
    let temp = html.convert(he.decode(text), {preserveNewlines: true});
    textArray = temp.split('\n');
	for(let i in textArray){
		if(textArray[i].indexOf("[/front/document.send.php?docid=") >= 0){
			delete textArray[i-1];
			delete textArray[i];
		}
	}
    let messageText = '';
    for(let k in textArray){
        if(textArray[k][0] != '>' && textArray[k].trim() && textArray[k].indexOf('cellpadding="0"') == -1){
            messageText += textArray[k].trim().replace(/[<>]/g, '') + ' ';
        }
    }
    return messageText.replace(/\[.*?\]/g, '');
}

exports.parseMessageText = async(message, addSilentInfo) => {
    let color = '🟢';
    if(message.hasOwnProperty('status')){
        switch(message.status){
            case 1: color = '🟢'; break;
            case 2: color = '🔵'; break;
            case 4: color = '🟠'; break;
            case 6: color = '⚫'; break;
            default: color = '⚫';
        }  
    }
    let ticketId = message.text.split('\n')[0].split('№')[1];
    if(!addSilentInfo){
        addSilentInfo = '';
    }else addSilentInfo = '/' + addSilentInfo;
    let silentInfo = `<a href="${message.entities[0].url}${addSilentInfo}">&#8203</a>`;
    text = message.text.split('\n');
    messageText = `${silentInfo}${color} <b>ЗАЯВКА  <a href="${glpiUrl}front/ticket.form.php?id=${ticketId}">№${ticketId}</a></b>\n\n`; 
    for(let i = 2; i < text.length; i++){
        if(text[i].indexOf(':') >= 0) messageText += `<b>${text[i].replace(':', ':</b>')}\n`;
    }
    for(let i in message.entities){
        if(message.entities[i].type == 'text_link' && message.entities[i].url.indexOf(glpiUrl + 'front/document.send.php?docid=') > 0){
            messageText = messageText.substring(0, messageText.length - 1).replace('screen', '');
            messageText += `<a href="${message.entities[i].url}">screen</a>`;
        }
    }
    if(text[text.length - 1].indexOf("Читать дальше") >= 0){
        messageText = `${messageText.replace('Читать дальше', '')}\n<b><a href="${glpiUrl}front/ticket.form.php?id=${ticketId}">Читать дальше</a></b>`;
    }
    return messageText;
}

exports.sleep = async(ms) => {
	return new Promise((resolve) => {
	  setTimeout(resolve, ms);
	});
}
