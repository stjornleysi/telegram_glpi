const he = require('he');
const html = require('html-to-text');
const fs = require('fs');
const cns = require('./const.js');

const dir = __dirname;
const conf = JSON.parse(fs.readFileSync(dir + "/../data/conf.json"));
const glpiUrl = conf.glpiConfig.apiurl.replace("apirest.php", "");

exports.htmlToText = async (text) => {
    try{
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
            if(textArray[k][0] != '>' && textArray[k].trim() && textArray[k].indexOf('ts@krtech.ru писал') == -1 && textArray[k].indexOf('cellpadding="0"') == -1){
                messageText += textArray[k].trim().replace(/[<>]/g, '') + ' ';
            }
        }
        return messageText.replace(/\[.*?\]/g, '');
    }catch(e){
        fs.appendFileSync(dir + "/../logs/logs.json", JSON.stringify("*** htmlToText:\n" + e, null, 3));
    }
}

exports.parseMessageText = async (message, messageData, ticketId) => {
    try{   
        let color = await this.getTicketColor(messageData.data[ticketId].status);
        text = message.text.split('\n');
        messageText = `${color} <b>ЗАЯВКА  <a href="${glpiUrl}front/ticket.form.php?id=${ticketId}">№${ticketId}</a></b>\n\n`;
        for(let i = 2; i < text.length; i++){
            if(text[i].indexOf(':') >= 0) messageText += `<b>${text[i].replace(':', ':</b>')}\n`;
        }
        if(text[text.length - 1].indexOf("Читать дальше") >= 0){
            messageText = `${messageText.replace('Читать дальше', '')}\n<b><a href="${glpiUrl}front/ticket.form.php?id=${ticketId}">Читать дальше</a></b>`;
        }
        return messageText;
    }catch(e){
        fs.appendFileSync(dir + "/../logs/logs.json", JSON.stringify("*** parseMessageText:\n" + e, null, 3));
    }    
}

exports.createThread = async (bot, messageData, ticketId, title) => {
    try{
        let td = messageData.data[ticketId];
        let thread = await bot.telegram.createForumTopic(conf.supportChatId, title, {
            icon_custom_emoji_id: '5357315181649076022'
        });
        let status = td.status;
        messageData.data[ticketId].threadId = thread.message_thread_id;
        let inKeyboard = await this.getKeyboardFromStatus(status);
        await this.editMessageMarkup(bot, td.messageId, inKeyboard);
        let msg = await bot.telegram.copyMessage(conf.supportChatId, conf.supportChatId, td.messageId, {
            parse_mode: 'HTML',
            disable_notification: true,
            message_thread_id: thread.message_thread_id,
            reply_markup: { inline_keyboard: inKeyboard }
        });
        await bot.telegram.pinChatMessage(conf.supportChatId, msg.message_id, { disable_notification: true });
        messageData.data[ticketId].pinMessageId = msg.message_id;
        fs.writeFileSync(dir + "/../data/messageData.json", JSON.stringify(messageData, null, 3));
    }catch(e){
        fs.appendFileSync(dir + "/../logs/logs.json", JSON.stringify("*** createThread:\n" + e, null, 3));
    }
}

exports.closeThread = async (bot, messageData, ticketId) => {
	await bot.telegram.deleteForumTopic(conf.supportChatId, messageData.data[ticketId].threadId);
    delete messageData.data[ticketId].threadId;
    delete messageData.data[ticketId].pinMessageId;
	let jsonData = JSON.stringify(messageData, null, 3);
	fs.writeFileSync(dir + "/../data/messageData.json", jsonData);
}

exports.getTicketColor = async (status) => {
    switch(status){
        case 1: color = '🟢'; break;
        case 2: color = '🔵'; break;
        case 3: color = '🔵'; break;
        case 4: color = '🟠'; break;
        case 6: color = '⚫'; break;
        default: color = '⚫';
    }  
    return color;
}

exports.getKeyboardFromStatus = async (status) => {
    let keyboard = cns.inlineKeyboards.open;
    if(status == 5 || status == 6){
        keyboard = cns.inlineKeyboards.close;
    }
    return keyboard;
}

exports.editMessageText = async (bot, messageId, messageText, keyboard) => {
    try{
        await bot.telegram.editMessageText(conf.supportChatId, messageId, undefined, messageText, {
            parse_mode: 'HTML',
            reply_markup: {inline_keyboard: keyboard}
        });
	}catch(e){
		//fs.appendFileSync(dir + "/../logs/logs.json", JSON.stringify(e, null, 3));
	}
}

exports.editMessageMarkup = async (bot, messageId, keyboard) => {
    try{
        await bot.telegram.editMessageReplyMarkup(conf.supportChatId, messageId, undefined, {inline_keyboard: keyboard});
	}catch(e){
		//fs.appendFileSync(dir + "/../logs/logs.json", JSON.stringify(e, null, 3));
	}
}

exports.sleep = async (ms) => {
	return new Promise((resolve) => {
	  setTimeout(resolve, ms);
	});
}

