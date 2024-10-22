const glpm = require('./glpm.js');
const cns = require('./const.js');
const {
    sleep, htmlToText, createThread, closeThread, getTicketColor,
    parseMessageText, getKeyboardFromStatus, editMessageText, editMessageMarkup
} = require('./utils.js');
const fs = require('fs');

const dir = __dirname;
let conf = JSON.parse(fs.readFileSync(dir + "/../data/conf.json"));
const glpiUrl = conf.glpiConfig.apiurl.replace("apirest.php", "");

exports.parseTickets = async (bot, messageData) => {
    let listTickets = await glpm.getAllItems('Ticket', 5);
    for(let i = 4; i >= 0; i--){
        try{
            let ticketId;
            if(!listTickets[i]) break;
            ticketId = listTickets[i].id;
            if(ticketId <= messageData.ticket) continue;
            if(listTickets[i].users_id_recipient != conf.glpiConfig.user_id){
                let usersArray = await glpm.getUsers(ticketId);
                let authorEmail;
                if(!usersArray[0]) continue;
                if(usersArray[0].hasOwnProperty('alternative_email') && usersArray[0].alternative_email){
                    authorEmail = usersArray[0].alternative_email;
                }else{
                    let temp = await glpm.getItem("User", usersArray[0].users_id);
                    authorEmail = temp.firstname + ' ' + temp.realname;
                }
                let text = await htmlToText(listTickets[i].content);
                let messageText = `🟢 <b>ЗАЯВКА  <a href="${glpiUrl}front/ticket.form.php?id=${ticketId}">№${ticketId}</a></b>\n\n`;
                messageText += `<b>Автор заявки: </b>${authorEmail}\n`;
                messageText += `<b>Проблема: </b>${listTickets[i].name}\n<b>Описание: </b>`;
                messageText += text;
                if(messageText.length > 600){
                    messageText = `${messageText.substring(0, 500)} + '\n\n<b><a href="${glpiUrl}front/ticket.form.php?id=${ticketId}">Читать дальше</a></b>`;
                }
                let messg = await bot.telegram.sendMessage(conf.supportChatId, messageText, {
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: cns.inlineKeyboards.open }
                });
                await editMessageText(bot, messg.message_id, messageText, cns.inlineKeyboards.open);
                messageData.data[ticketId] = {
                    messageId: messg.message_id,
                    status: 1
                };
                let title = `🟢 ${ticketId} - ${listTickets[i].name}`;
                await createThread(bot, messageData, ticketId, title);
                await sleep(1000);
            }
            messageData.ticket = ticketId;
            fs.writeFileSync(dir + "/../data/messageData.json", JSON.stringify(messageData, null, 3));
        }catch(e){
            fs.appendFileSync(dir + "/../logs/logs.json", JSON.stringify("*** parseTickets:\n" + e, null, 3));
        }
    }
}

exports.parseComments = async (bot, messageData) => {
    let listComments = await glpm.getAllItems('ITILFollowup', 5);
    for (let i = 4; i >= 0; i--) {
        try{
            if(!listComments[i]) break;
            let commentId = listComments[i].id;
            if(commentId <= messageData.comment) continue;
            if(listComments[i].users_id != conf.glpiConfig.user_id){
                let ticketId = listComments[i].items_id;
                if(!messageData.data.hasOwnProperty(ticketId) || !messageData.data[ticketId].hasOwnProperty("threadId")) continue;
                let comment = await htmlToText(listComments[i].content);
                let user;
                if(listComments[i].users_id){
                    let temp = await glpm.getItem("User", listComments[i].users_id);
                    user = temp.firstname + ' ' + temp.realname;
                }else{
                    let temp = await glpm.getUsers(ticketId);
                    user = temp[0].alternative_email;
                }
                if(!messageData.data.hasOwnProperty(ticketId) || !messageData.data[ticketId].hasOwnProperty('threadId')){
                    return;
                }
                let messageText = `<b>Комментарий от ${user}:</b>\n\n${comment}`;
                if(messageText.length > 2400){
                    messageText = `${messageText.substring(0, 2400)} + '\n\n<b><a href="${glpiUrl}front/ticket.form.php?id=${ticketId}">Читать дальше</a></b>`;
                }
                await bot.telegram.sendMessage(conf.supportChatId, messageText, {parse_mode: "HTML", message_thread_id: messageData.data[ticketId].threadId});            
                await sleep(1000);
            }
            messageData.comment = commentId;
            fs.writeFileSync(dir + "/../data/messageData.json", JSON.stringify(messageData, null, 3));
        }catch(e){
            fs.appendFileSync(dir + "/../logs/logs.json", JSON.stringify("*** parseComments:\n" + e, null, 3));
        }
    }
}

exports.refreshStatus = async (bot, messageData) => {
	let listTickets = await glpm.getAllItems('Ticket', 100);
	for(let i = 99; i >= 0; i--){
        try{
            let ticketId = listTickets[i].id;
            if(!listTickets[i] || !messageData.data.hasOwnProperty(ticketId)) continue;
            let td = messageData.data[ticketId];
            if(td.status != listTickets[i].status){
                let usersArray = await glpm.getUsers(ticketId);
                let message = await htmlToText(listTickets[i].content);
                let authorEmail;
                if(!usersArray[0]) authorEmail == "Unknown";
                else if(usersArray[0].hasOwnProperty('alternative_email') && usersArray[0].alternative_email){
                    authorEmail = usersArray[0].alternative_email;
                }else if(usersArray[0].users_id == conf.glpiConfig.user_id){
                    await editTicketStatus(bot, messageData, message);
                    continue;
                }else{
                    let temp = await glpm.getItem("User", usersArray[0].users_id);
                    authorEmail = temp.firstname + ' ' + temp.realname;
                }
                let color = await getTicketColor(listTickets[i].status);				
                let messageText = `${color} <b>ЗАЯВКА  <a href="${glpiUrl}front/ticket.form.php?id=${ticketId}">№${ticketId}</a></b>\n\n`;
                messageText += `<b>Автор заявки: </b>${authorEmail}\n`;
                messageText += `<b>Проблема: </b>${listTickets[i].name}\n<b>Описание: </b>`;
                messageText += message;
                if(messageText.length > 600){
                    messageText = `${messageText.substring(0, 500)} + '\n\n<b><a href="${glpiUrl}front/ticket.form.php?id=${ticketId}">Читать дальше</a></b>`;
                }
                let inKeyboard = await getKeyboardFromStatus(listTickets[i].status);
                if(td.hasOwnProperty('threadId')){
                    if(listTickets[i].status == 5 || listTickets[i].status == 6){
                        await closeThread(bot, messageData, ticketId);
                    }else{
                        let title = `${color} ${ticketId} - ${listTickets[i].name}`;
                        await bot.telegram.editForumTopic(conf.supportChatId, td.threadId, { name: title });
                    }                  
                } 
                await editMessageText(bot, td.messageId, messageText, inKeyboard);   
                await editMessageText(bot, td.pinMessageId, messageText, inKeyboard);             
                messageData.data[ticketId].status = listTickets[i].status;
			}else if(td.hasOwnProperty('threadId') && (listTickets[i].status == 5 || listTickets[i].status == 6)){
                await closeThread(bot, messageData, ticketId);
            }
        }catch(e){
            fs.appendFileSync(dir + "/../logs/logs.json", JSON.stringify("*** refreshStatus:\n" + e, null, 3));
        }
	}
	fs.writeFileSync(dir + "/../data/messageData.json", JSON.stringify(messageData, null, 3));
}

exports.editTicketStatus = async (bot, messageData, message) => {
    try{
        let ticketId = message.text.split('№')[1].split('\n')[0];
        let ticket = await glpm.getItem('Ticket', ticketId);
        let inKeyboard = await getKeyboardFromStatus(ticket.status);
        if(messageData.data[ticketId].status != ticket.status){
            messageData.data[ticketId].status = ticket.status;
            let color = await getTicketColor(ticket.status);
            let title = ticket.name;
            if(messageData.data[ticketId].hasOwnProperty('userChatId')){
                title = `${title.split(' - ')[1]} - ${title.split(' - ')[2]}`;
            }
            title = `${color} ${ticketId} - ${title}`;
            if(messageData.data[ticketId].hasOwnProperty('threadId')){
                await bot.telegram.editForumTopic(conf.supportChatId, messageData.data[ticketId].threadId, { name: title });
            }
            let messageText = await parseMessageText(message, messageData, ticketId);
            await editMessageText(bot, messageData.data[ticketId].messageId, messageText, inKeyboard);   
            await editMessageText(bot, messageData.data[ticketId].pinMessageId, messageText, inKeyboard);  
        }
        await editMessageMarkup(bot, message.message_id, inKeyboard);
        fs.writeFileSync(dir + "/../data/messageData.json", JSON.stringify(messageData, null, 3));      
    }catch(e){
        fs.appendFileSync(dir + "/../logs/logs.json", JSON.stringify("*** editTicketStatus:\n" + e, null, 3));
    }
}