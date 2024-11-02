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
        let ticketId;
        try{
            if(!listTickets[i]) break;
            ticketId = listTickets[i].id;
            if(ticketId <= messageData.ticket) continue;
            let userRecipient = listTickets[i].users_id_recipient;
            let ticketAuthor = "Unknown";
            if(userRecipient != conf.glpiConfig.user_id){
                if(userRecipient != 0){
                    let temp = await glpm.getItem("User", userRecipient);
                    ticketAuthor = temp.firstname + ' ' + temp.realname;                    
                }else{
                    let usersArray = await glpm.getUsers(ticketId);
                    if(usersArray[0].hasOwnProperty('alternative_email')){
                        ticketAuthor = usersArray[0].alternative_email;
                    }
                }
                let messageText = await parseMessageText(listTickets[i], ticketAuthor, "🟢");
                let messg = await bot.telegram.sendMessage(conf.supportChatId, messageText, {
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: cns.inlineKeyboards.open }
                });
                //await editMessageText(bot, messg.message_id, messageText, cns.inlineKeyboards.open);
                messageData.data[ticketId] = {
                    messageId: messg.message_id,
                    status: 1
                };
                let title = `🟢 ${ticketId} - ${listTickets[i].name}`;
                await createThread(bot, messageData, ticketId, title);
                await sleep(1000);
            }
        }catch(e){
            fs.appendFileSync(dir + "/../logs/logs.txt", e.stack);
        }
        messageData.ticket = ticketId;
        fs.writeFileSync(dir + "/../data/messageData.json", JSON.stringify(messageData, null, 3));
    }
}

exports.parseComments = async (bot, messageData) => {
    let listComments = await glpm.getAllItems('ITILFollowup', 5);
    for (let i = 4; i >= 0; i--) {
        let commentId;
        try{
            if(!listComments[i]) break;
            commentId = listComments[i].id;
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
            }
        }catch(e){
            fs.appendFileSync(dir + "/../logs/logs.txt", e.stack);
        }
        messageData.comment = commentId;
        fs.writeFileSync(dir + "/../data/messageData.json", JSON.stringify(messageData, null, 3));
    }
}

exports.refreshStatus = async (bot, messageData) => {
	let listTickets = await glpm.getAllItems('Ticket', 100);
	for(let i = 99; i >= 0; i--){
        try{
            if(!listTickets[i] || !messageData.data.hasOwnProperty(listTickets[i].id)) continue;
            await this.editTicketStatus(bot, messageData, listTickets[i].id, true);
        }catch(e){
            fs.appendFileSync(dir + "/../logs/logs.txt", e.stack);
        }
	}
	fs.writeFileSync(dir + "/../data/messageData.json", JSON.stringify(messageData, null, 3));
}

exports.editTicketStatus = async (bot, messageData, ticketId, fastRequests) => {
    try{
        let ticket = await glpm.getItem('Ticket', ticketId);
        let inKeyboard = await getKeyboardFromStatus(ticket.status);
        if(messageData.data[ticketId].status != ticket.status){
            let color = await getTicketColor(ticket.status);
            let ticketAuthor = "Unknown";
            if(ticket.users_id_recipient != 0){
                let temp = await glpm.getItem("User", ticket.users_id_recipient);
                ticketAuthor = temp.firstname + ' ' + temp.realname;                    
            }else{
                let usersArray = await glpm.getUsers(ticketId);
                if(usersArray[0].hasOwnProperty('alternative_email')){
                    ticketAuthor = usersArray[0].alternative_email;
                }
            }
            let messageText = await parseMessageText(ticket, ticketAuthor, color);
            if(messageData.data[ticketId].hasOwnProperty('threadId')){
                if(ticket.status == 5 || ticket.status == 6){
                    await closeThread(bot, messageData, ticketId);
                }else{
                    let title = `${color} ${ticketId} - ${ticket.name}`;
                    await bot.telegram.editForumTopic(conf.supportChatId, messageData.data[ticketId].threadId, { name: title });
                    await editMessageText(bot, messageData.data[ticketId].pinMessageId, messageText, inKeyboard);
                }
                await sleep(1000);
            }
            await editMessageText(bot, messageData.data[ticketId].messageId, messageText, inKeyboard);
            messageData.data[ticketId].status = ticket.status;
            fs.writeFileSync(dir + "/../data/messageData.json", JSON.stringify(messageData, null, 3));  
        }else if(!fastRequests){
            await editMessageMarkup(bot, messageData.data[ticketId].messageId, inKeyboard);
            if(messageData.data[ticketId].hasOwnProperty('threadId')){
                await editMessageMarkup(bot, messageData.data[ticketId].pinMessageId, inKeyboard);
            }
        }
    }catch(e){
        fs.appendFileSync(dir + "/../logs/logs.txt", e.stack);
    }
}