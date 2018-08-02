var express = require('express')
var jmap = require('./maps.json')
var app = express()
var table = require('text-table');
var moment = require('moment-timezone')
moment.tz.setDefault("Europe/Berlin");
var didYouMean = require('didyoumean')
didYouMean.threshold = null
var request = require('request')
var Entities = require('html-entities').AllHtmlEntities;
var entities = new Entities();
var parse = require('himalaya')
const loggd = require("loggd")
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TELEGRAM, {
	polling: true
});

const db = new loggd("./files/user.json")
const tran = require('./translations.json')

const intro = {german: `${tran[0].german}\n\n• ${tran[1].german}\n\`Webergasse\nPostplatz\`\n\n• ${tran[2].german} \`Am Anger\`\n\n• ${tran[3].german} \`/l 6\`\n\n• ${tran[4].german}\n\n${tran[5].german}`, english: `${tran[0].english}\n\n• ${tran[1].english}\n\`Webergasse\nPostplatz\`\n\n• ${tran[2].english} \`Am Anger\`\n\n• ${tran[3].english} \`/l 6\`\n\n• ${tran[4].english}\n\n${tran[5].english}`}

function language(userid, cb){
  db.find({id: userid})
    .then((Data) => {
        if (Data && Data.result && Data.result.length && Data.result[0] && Data.result[0].lang && (Data.result[0].lang == "german" || Data.result[0].lang == "english")){
          cb(Data.result[0].lang)
        } else {
          var telegramfunc = [
            [{
              text: "English",
              callback_data: JSON.stringify({setlang:true,lang:"english"})
            }, {
              text: "Deutsch",
              callback_data: JSON.stringify({setlang:true,lang:"german"
              })
            }]
          ];
          var telew = {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: {
              inline_keyboard: telegramfunc
            }
          }
          bot.sendMessage(userid, "Bitte wähle eine Sprache für diesen Bot.\nPlease choose a language to use with this bot.", telew)
          
        }
    })
}
app.get('/', (req, res) => res.send('?'))
var t_help = "Welcome to the Dresden Transit bot! I can help you navigate Dresden, Germany. Here's what you can do with me:\n\n• *Get directions* from one stop to another. Just type the first stop, _press enter_ and then the second stop. Example: \n`Schillerplatz\nWebergasse`\n\n• *Get the departure board* for a specific stop using real-time data from DVB. Just type the stop and send the message. Example: `Am Anger`\n\n• *Get a line map* using `/l`, and see what stops are accessible on a line at the current time. Example: `/l 4`\n\n• *Get maps* of the system. Type /m to see a list of all that are available.\n\nI can handle the entire VVO network. If you run into any problems or have feedback, message my creator, @rileyw. Cheers!"
var t_standard = {
	parse_mode: 'Markdown',
	disable_web_page_preview: true
}
bot.onText(/\/help/, (msg, match) =>   
           language(msg.chat.id, function(po){

    bot.sendMessage(msg.chat.id, intro[po], t_standard)
  })
	
)
bot.onText(/\/s/, (msg, match) => {

var telegramfunc = [
            [{
              text: "English",
              callback_data: JSON.stringify({setlang:true,lang:"english"})
            }, {
              text: "Deutsch",
              callback_data: JSON.stringify({setlang:true,lang:"german"
              })
            }]
          ];
          var telew = {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: {
              inline_keyboard: telegramfunc
            }
          }
          bot.sendMessage(msg.chat.id, "Bitte wähle eine Sprache für diesen Bot.\nPlease choose a language to use with this bot.", telew)
})
bot.onText(/\/start/, (msg, match) => {
	language(msg.chat.id, function(po){
    bot.sendMessage(msg.chat.id, intro[po], t_standard)
  })
})
bot.onText(/\/map (.+)/, (msg, match) => {
	bot.sendDocument(msg.chat.id, jmap[match[1]].url, {
		caption: `*${jmap[match[1]].title}*\n${jmap[match[1]].description}`,
		parse_mode: "Markdown"
	})
})
bot.onText(/\/d (.+)/, (msg, match) => {
	bot.sendChatAction(msg.chat.id, "typing")
	departures(match[1], msg.chat.id)
})
bot.onText(/\/l (.+)/, (msg, match) => {
	const resp = match[1];
	request.post('http://imetro.nanika.net/metro', {
		form: {
			a: "l",
			o: "h",
			g: "en",
			u: "",
			v: "DRESDEN",
			j: "N",
			h: 1,
			d: '',
			z: '',
			w: 1
		},
		headers: {
			"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
			"Cookie": "city=DRESDEN"
		}
	}, function(error, response, body) {
		var post = require('himalaya').parse(body),
			maps = [],
			i, ib;
		for (i = 0; i < post[2].children[3].children[5].children[3].children[5].children[1].children[3].children[1].children.length; i++) {
			var splitter = post[2].children[3].children[5].children[3].children[5].children[1].children[3].children[1].children[i].children[0].content.split(' ');
			for (ib = 0; ib < splitter.length; ib++) {
				if (splitter[ib] == resp) {
					bot.sendPhoto(msg.chat.id, `http://imetro.nanika.net/metro?a=t&g=en&v=DRESDEN&l=${i}&o=g&te=${Math.random()*100}`);
					return;
				}
			}
			maps.push({
				name: post[2].children[3].children[5].children[3].children[5].children[1].children[3].children[1].children[i].children[0].content,
				number: post[2].children[3].children[5].children[3].children[5].children[1].children[3].children[1].children[i].attributes[0].value
			})
		}
		var thisindex = findIndexFromMaps(maps, didYouMean(resp, maps, 'name'))
		bot.sendPhoto(msg.chat.id, `http://imetro.nanika.net/metro?a=t&g=en&v=DRESDEN&l=${thisindex}&o=g&te=${Math.random()*100}`)
	})
})
//function to find index from map batch
function findIndexFromMaps(maps, name) {
	var i;
	for (i = 0; i < maps.length; i++) {
		if (maps[i].name == name) {
			return maps[i].number
		}
	}
}
bot.on('message', (msg) => {
  language(msg.chat.id, function(po){
    
	if (msg.text == "/l") {
		bot.sendMessage(msg.chat.id, tran[8][po]+" `/l s2`", t_standard)
	} else if (msg.text == "/r") {
		bot.sendMessage(msg.chat.id, tran[6][po]+" \n\n`Schillerplatz\nWebergasse`", t_standard)
	} else if (msg.text == "/d") {
		bot.sendMessage(msg.chat.id, tran[7][po]+" `Am Anger`", t_standard)
	} else if (msg.text == "/m") {
		bot.sendMessage(msg.chat.id, tran[25][po], {
			reply_markup: {
				inline_keyboard: [
					[{
						"text": tran[26][po],
						"switch_inline_query_current_chat": "maps"
					}]
				]
			}
		})
	} else if (msg.text.includes("\n") || (msg.text.includes("/r") && msg.text.includes("\n"))) {
		var stopss = msg.text.replace("/r ", '').split("\n")
		console.log(stopss)
		nav(stopss[0], stopss[1], msg.chat.id)
	} else if (!msg.text.includes("/m") && !msg.text.includes("/s") && !msg.text.includes("/r") && !msg.text.includes("/l") && !msg.text.includes("/d") && !msg.text.includes("/start") && !msg.text.includes("/help") && !msg.text.includes("/map") ){
  
    bot.sendChatAction(msg.chat.id, "typing")
	departures(msg.text, msg.chat.id)
  }
  })
});
bot.on('callback_query', (msg) => {
	var parser = JSON.parse(msg.data)
	console.log(msg)//{setlang:true,lang:"english"}
	if (parser.setlang && parser.lang && (parser.lang =="english" || parser.lang == "german")){
    
    db.find({id: msg.from.id})
    .then((Data) => {
      if (Data.result.length == 0){
      
        db.insert({id:msg.from.id, username: msg.from.username, lang: parser.lang}).then((d) => {
      if(parser.lang=="german"){bot.answerCallbackQuery(msg.id, {text: "Sprache gespeichert."});}else if(parser.lang=="english"){bot.answerCallbackQuery(msg.id, {text: "Language saved."});};
      bot.sendMessage(msg.from.id, intro[parser.lang], t_standard)
    })
        
      } else if (Data.result.length == 1){
        Data.result[0].lang = parser.lang
        Data.updateOne(0)
        if(parser.lang=="german"){bot.answerCallbackQuery(msg.id, {text: "Sprache gespeichert."});}else if(parser.lang=="english"){bot.answerCallbackQuery(msg.id, {text: "Language saved."});};
        
      }
                 
        
    })
    
    
  } else if(parser.d) {
		// nav directions, d is depart station, a is arrival station
		bot.answerCallbackQuery(msg.id, {
			text: ""
		});
		nav(parser.d, parser.a, msg.from.id)
	} else if (parser.c == 1) {
		// nav directions, d is depart station, a is arrival station
		bot.answerCallbackQuery(msg.id, {
			text: ""
		});
		nav(parser.d, parser.a, msg.from.id)
	} else if (parser.f) {
		bot.sendChatAction(msg.from.id, "typing")
		bot.answerCallbackQuery(msg.id, {
			text: ""
		});
		// get departure board, f is station id 8 digits
		departures(parser.f, msg.from.id)
	} else if (parser.dm) {
		//update departure board, dm is station id 8 digits
		updatedepartures(msg.message.chat.id, msg.message.message_id, parser.dm, msg.message.text, msg.id)
	} else if (parser.hash){
    bot.sendChatAction(msg.from.id, "upload_document")
    bot.answerCallbackQuery(msg.id, {
			text: ""
		});
    
    var haha = request.post({
				headers: {
					'Accept': 'application/json, text/plain, */*',
					'Content-Type': 'application/json;charset=UTF-8',
					'Origin': 'https://m.dvb.de',
					'Referer': 'https://m.dvb.de/',
					'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36'
				},
				url: 'https://webapi.vvo-online.de/tr/trippdf?format=json',
				json: true,
				body: {
					"id":0,"origin":parser.fro,"destination":parser.to,"isarrivaltime":false,"mobilitysettings":{"mobilityRestriction":"None"},"standardSettings":{"maxChanges":"Unlimited","walkingSpeed":"Normal","extraCharge":"None","footpathToStop":5,"mot":["Tram","CityBus","IntercityBus","SuburbanRailway","Train","Cableway","Ferry","HailedSharedTaxi"],"includeAlternativeStops":true},"time":moment().format(),"numberprev":0,"numbernext":0,"sessionid":parser.hash

				}
			}, function(error, response, body) {
    
    })
    bot.sendDocument(msg.from.id,haha,{},{
  // Explicitly specify the file name.
  filename: 'pdf.pdf',
  // Explicitly specify the MIME type.
  contentType: 'application/pdf',
})
  }
})

function updatedepartures(chatid, messageid, stopid, original, inlineid) {
  language(chatid, function(po){
	request.post({
				headers: {
					'Accept': 'application/json, text/plain, */*',
					'Content-Type': 'application/json;charset=UTF-8',
					'Origin': 'https://m.dvb.de',
					'Referer': 'https://m.dvb.de/',
					'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36'
				},
				url: 'https://webapi.vvo-online.de/dm?format=json',
				json: true,
				body: {
					"stopid": stopid,
					"isarrival": false,
					"limit": 12,
					"shorttermchanges": true,
					"mentzonly": false,
					"mot": ["Tram", "CityBus", "IntercityBus", "SuburbanRailway", "Train", "Cableway", "Ferry", "HailedSharedTaxi"]
				}
			}, function(error, response, body) {
				var i, stopsarray = [];
				//console.log(body)
				if (body.Status.Code.toUpperCase().includes("ERROR")) {
					bot.sendMessage(messageid, "Error: " + body.Status.Message)
					return;
				}
				for (i = 0; i < body.Departures.length; i++) {
					if (body.Departures[i].RealTime) {
						stopsarray.push([body.Departures[i].LineName, body.Departures[i].Direction.substring(0, 13), Math.floor(moment.duration(moment().diff(moment.unix(body.Departures[i].RealTime.substring(6, 16)))).asMinutes()) * -1])
					} else if (body.Departures[i].ScheduledTime) {
						stopsarray.push([body.Departures[i].LineName, body.Departures[i].Direction.substring(0, 13), Math.floor(moment.duration(moment().diff(moment.unix(body.Departures[i].ScheduledTime.substring(6, 16)))).asMinutes()) * -1])
					}
				}
				var t = table(stopsarray);
				var board = `${tran[9][po]} *${body.Name}*\n${"`"}${t}${"`"}`;
        
    
                var tale = {text: board, chat_id: chatid, message_id:messageid, parse_mode: 'Markdown', reply_markup: {inline_keyboard: [[{text: tran[10][po], callback_data:JSON.stringify({dm:stopid})}]]}}
                bot.answerCallbackQuery(inlineid, {
      text: tran[28][po]
    });
        bot.editMessageText(board, tale)
        
      });
  })
    }

function departures(location, id){
  	language(id, function(po){

  //{"stopid":"33000054","time":"2018-07-08T03:03:00.000Z","isarrival":false,"limit":30,"shorttermchanges":true,"mentzonly":false,"mot":["Tram","CityBus","IntercityBus","SuburbanRailway","Train","Cableway","Ferry","HailedSharedTaxi"]}
  stop(location, function(o){
    if (o.length == 0){
      bot.sendMessage(id, tran[11][po])
    } else if (o.length == 1){
      request.post({
        headers: {'Accept' : 'application/json, text/plain, */*', 'Content-Type' : 'application/json;charset=UTF-8', 'Origin' : 'https://m.dvb.de', 'Referer' : 'https://m.dvb.de/', 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36'},
        url: 'https://webapi.vvo-online.de/dm?format=json',
        json: true,
        body: {"stopid": o[0][0], "isarrival":false, "limit":12, "shorttermchanges":true, "mentzonly":false, "mot":["Tram","CityBus","IntercityBus","SuburbanRailway","Train","Cableway","Ferry", "HailedSharedTaxi"]} }, function(error, response, body){
        var i, stopsarray = [];
        console.log(body)
        if (body.Status.Code.toUpperCase().includes("ERROR")){
          bot.sendMessage(id, "Error - "+o[0][1]+": " + body.Status.Message)
          return;
        }
        for (i=0;i<body.Departures.length;i++){
          if (body.Departures[i].RealTime){
            stopsarray.push([body.Departures[i].LineName, body.Departures[i].Direction.substring(0,13), Math.floor(moment.duration(moment().diff(moment.unix(body.Departures[i].RealTime.substring(6,16)))).asMinutes())*-1])

          } else if (body.Departures[i].ScheduledTime){
            stopsarray.push([body.Departures[i].LineName, body.Departures[i].Direction.substring(0,13), Math.floor(moment.duration(moment().diff(moment.unix(body.Departures[i].ScheduledTime.substring(6,16)))).asMinutes())*-1])

          }
        }
        
        var t = table(stopsarray);
        var tale = {parse_mode: 'Markdown', reply_markup: {inline_keyboard: [[{text: tran[10][po], callback_data:JSON.stringify({dm:o[0][0]})}]]}}

        bot.sendMessage(id, `${tran[9][po]} *${body.Name}*\n${"`"}${t}${"`"}`, tale)
        
      });
    } else {
    //90210
      
      var telegramfunc = [], i;
          for (i=0;i<o.length;i++){
            telegramfunc.push([{
              text: o[i][1],
              callback_data: JSON.stringify({
                f: o[i][0]
              })
            }])
          }
          var tele = {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: {
            inline_keyboard: telegramfunc
          }}

          bot.sendMessage(id, tran[28][po], tele)
      
    }
  })
    })
}

bot.on('inline_query', (msg) => {
  console.log(msg.query)
  if (msg.query.toUpperCase().includes("MAP")){
    console.log(2)
    
    var maps_to_send = [],i;
    for (i=0;i<jmap.length;i++){
      maps_to_send.push({type:"article", id:i, input_message_content: {message_text:"/map "+i}, description: jmap[i].description, thumb_url: jmap[i].thumb, title: jmap[i].title})
    }
    
    
    bot.answerInlineQuery(msg.id, maps_to_send, {cache_time: 50000})
  }
})



function stop(name, callback){
  if (!/^\d{9}$/.test(Number(name))){
    request.post({
      headers: {'Accept' : 'application/json, text/plain, */*', 'Content-Type' : 'application/json;charset=UTF-8', 'Origin' : 'https://m.dvb.de', 'Referer' : 'https://m.dvb.de/', 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36'},
      url: 'https://webapi.vvo-online.de/tr/pointfinder',
      json: true,
      body: {query: name}
    }, function(error, response, body){
      var i, stopsarray = [];
      for (i=0;i<body.Points.length;i++){
        if (body.Points[i].includes("|||")){
          stopsarray.push([Number(body.Points[i].substring(0,8)), body.Points[i].split("|")[3]]);
        }
        
        if(i == body.Points.length-1){
          callback(stopsarray)
        }
      }
    });
  } else {
    callback(Number(name))
  }
}


//     request.post({
//       headers: {'Accept' : 'application/json, text/plain, */*', 'Content-Type' : 'application/json', 'Origin' : 'https://m.dvb.de', 'Referer' : 'https://m.dvb.de/', 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36'},
//       url: 'https://webapi.vvo-online.de/tr/trips?format=json',
//       json: true,
//       body: {"origin":first.toString(),"destination":second.toString(),"isarrivaltime":false,"shorttermchanges":true,"mobilitySettings":{"mobilityRestriction":"None"},"standardSettings":{"maxChanges":"Unlimited","walkingSpeed":"Normal","extraCharge":"None","footpathToStop":5,"mot":["Tram","CityBus","IntercityBus","SuburbanRailway","Train","Cableway","Ferry","HailedSharedTaxi"],"includeAlternativeStops":true}}
//     }, function(error, response, body){
//       console.log(body.Status.Code, body)
      
//       }
//                  )

function date(datee){
  return moment.unix(datee.substring(6,16)).format('HH:mm')
}

function post(po){
if (po.substring(0,1) == ' '){
  return po.substr(1);
} else {
  return po;
}
}

function emoji(ee){
  if(ee.toUpperCase().includes("TRAM")){
    return "🚋"
  } else if (ee.toUpperCase().includes("TRAIN")){
  return "🚄"
  } else if (ee.toUpperCase().includes("FERR")){
  return "⛴️"
  } else if (ee.toUpperCase().includes("TAXI")){
  return "🚕⚠️"
  }else if (ee.toUpperCase().includes("BUS")){
  return "🚌"
  }else if (ee.toUpperCase().includes("RAIL")){
  return "🚈"
  }else if (ee.toUpperCase().includes("CABLE")){
  return "🚠"
  }else{
  return "❓"
  }
}

function stairs(dir, lang){
  if (dir == "up"){
   if (lang == "english"){
     return "Take the stairs up"
   } else {
     return "Gehe die Treppe hinauf"
   }
  }else{
    if (lang == "english"){
      return "Take the stairs down"
    } else {
      return "Gehe die Treppe hinab"
    }
  }
}

function plan(first,second,pid,callb){
    	language(pid, function(po){

  request.post({
      headers: {'Accept' : 'application/json, text/plain, */*', 'Content-Type' : 'application/json', 'Origin' : 'https://m.dvb.de', 'Referer' : 'https://m.dvb.de/', 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36'},
      url: 'https://webapi.vvo-online.de/tr/trips?format=json',
      json: true,
      body: {"origin":first.toString(),"destination":second.toString(),"isarrivaltime":false,"shorttermchanges":true,"mobilitySettings":{"mobilityRestriction":"None"},"standardSettings":{"maxChanges":"Unlimited","walkingSpeed":"Normal","extraCharge":"None","footpathToStop":5,"mot":["Tram","CityBus","IntercityBus","SuburbanRailway","Train","Cableway","Ferry","HailedSharedTaxi"],"includeAlternativeStops":true}}
    }, function(error, response, body){
      console.log(body.Status.Code, JSON.stringify(body))
      if (body.Status.Code != "Ok"){
        return callb(body.Status.Code+": "+body.Status.Message )
      }
      
    var thisroutee = body.Routes[0].PartialRoutes, directionsp = [];
    for (i=0;i<body.Routes[0].PartialRoutes.length;i++){
      console.log(directionsp)
      var cancel = true;
      if (thisroutee[i].Mot.Type.toUpperCase().includes("STAIR")){
        directionsp.push("`\n      ┇ `"+stairs(thisroutee[i].Mot.Type.substring(14).toLowerCase(), po))
      } else if (thisroutee[i].Mot.Type == "Footpath"){
        if (!thisroutee[i].RegularStops){
          if (thisroutee[i+1] && thisroutee[i+1].RegularStops && thisroutee[i+1].RegularStops[0].Platform.Name){
          directionsp.push("`\n      ┇ `"+tran[23][po]+" "+thisroutee[i+1].RegularStops[0].Platform.Name)
          } else {directionsp.push("`\n      ┇ `"+tran[29][po])}
          directionsp.splice(-1,1)
        
          cancel = false;
        } else {
        
        directionsp.push("`\n"+date(thisroutee[i].RegularStops[0].ArrivalTime)+" ┳ `"+thisroutee[i].RegularStops[0].Name+"`\n      ┃ `🚶 "+thisroutee[i].Duration+" min walk`\n"+date(thisroutee[i].RegularStops[thisroutee[i].RegularStops.length-1].ArrivalTime)+" ┻ `"+thisroutee[i].RegularStops[thisroutee[i].RegularStops.length-1].Name)+""}
      } else if (thisroutee[i].Mot.Type == "Train" || thisroutee[i].Mot.Type == "OverheadRailway" || thisroutee[i].Mot.Type == "Tram" || thisroutee[i].Mot.Type == "Taxi" || thisroutee[i].Mot.Type == "Bus" || thisroutee[i].Mot.Type == "Ferry" || thisroutee[i].Mot.Type == "RapidTransit"){
        directionsp.push("\n`"+date(thisroutee[i].RegularStops[0].ArrivalTime)+" ┳ `"+thisroutee[i].RegularStops[0].Name+"\n`      ┃ "+emoji(thisroutee[i].Mot.Type)+" `"+thisroutee[i].Mot.Name+" "+post(thisroutee[i].Mot.Direction)+"\n`"+date(thisroutee[i].RegularStops[thisroutee[i].RegularStops.length-1].ArrivalTime)+" ┻ `"+thisroutee[i].RegularStops[thisroutee[i].RegularStops.length-1].Name+"")
      }
      
      if (thisroutee[i+1] && cancel && directionsp[directionsp.length-1] != "`\n      ┇`"){
        directionsp.push("`\n      ┇`")
      }

    }
    request.post({
      headers: {'Accept' : 'application/json, text/plain, */*', 'Content-Type' : 'application/json', 'Origin' : 'https://m.dvb.de', 'Referer' : 'https://m.dvb.de/', 'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36'},
      url: 'https://m.dvb.de/create',
      json: true,
      body: {"deploy":"dvb","profile":"{\"start\":\""+first.toString()+"\",\"end\":\""+second.toString()+"\",\"via\":\"\",\"id\":0,\"time\":\""+moment().format()+"\",\"mobilitysettings\":\"{\\\"mobilityRestriction\\\":\\\"None\\\"}\",\"standardsettings\":\"{\\\"maxChanges\\\":\\\"Unlimited\\\",\\\"walkingSpeed\\\":\\\"Normal\\\",\\\"extraCharge\\\":\\\"None\\\",\\\"footpathToStop\\\":5,\\\"mot\\\":[\\\"Tram\\\",\\\"CityBus\\\",\\\"IntercityBus\\\",\\\"SuburbanRailway\\\",\\\"Train\\\",\\\"Cableway\\\",\\\"Ferry\\\",\\\"HailedSharedTaxi\\\"],\\\"includeAlternativeStops\\\":true}\",\"isarrivaltime\":false}","date":moment().format('YYYY-MM-DD HH:mm:ss')}
    }, function(error, response, bod){
      console.log("https://m.dvb.de/shared/app/connectionInfo?connectionHash="+bod.hash)
      directionsp.unshift("*"+body.Routes[0].Duration+" "+tran[19][po]+"*")
    var pci = ""+directionsp.join("")
    
    var telegramfunc = [[{
              text: tran[16][po],
              url: "https://m.dvb.de/shared/app/connectionInfo?connectionHash="+bod.hash
            }, {text: tran[18][po], callback_data:JSON.stringify({hash:body.SessionId,to:first.toString(),fro:second.toString()})}]];
          
          var telew = {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: {
            inline_keyboard: telegramfunc
          }}
    
    if (pci.slice(-1) == "`"){
      console.log("##")
      console.log(JSON.stringify(pci))
      callb(pci.replace(/`\s*$/, ""), telew)
      console.log(JSON.stringify(pci))
    } else {
      
      callb(pci+"", telew)
    }
    })
    
    //c//onsole.log(pci)
      }
                 )
      })
}

//stop("schillerplatz", function(d){console.log(d)})
function nav(leave, arrive, user){
  language(user, function(po){
  stop(leave, function(info){
    if (info.length == 1){
      stop(arrive, function(infoo){
        if (infoo.length == 1){
        //get directions
          console.log("WE DOGDSF. Get directions from", info[0][0], infoo[0][0])
          plan(info[0][0], infoo[0][0], user,function(p, top){
            bot.sendMessage(user, p,top)
            if (p.toUpperCase().includes("ALITA")){
            bot.sendMessage(user, tran[24][po],t_standard)
            }
          }, info[0][1], infoo[0][1])
        } else {
          //multiple arrival stops found
          var telegramfunc = [], i;
          for (i=0;i<infoo.length;i++){
            telegramfunc.push([{
              text: infoo[i][1],
              callback_data: JSON.stringify({
                d: info[0][0],
                a: infoo[i][0]
              })
            }])
          }
      if (!telegramfunc.length){
          bot.sendMessage(user,tran[15][po])
            return
          }
          var tele = {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: {
            inline_keyboard: telegramfunc
          }}

          bot.sendMessage(user, tran[14][po], tele)
        }
      })
    } else {
      //multiple destination stops found
      var telegramfunc = [], i;
      for (i=0;i<info.length;i++){
        telegramfunc.push([{
          text: info[i][1],
          callback_data: JSON.stringify({
            c:1,
            d: info[i][0],
            a: arrive
          })
        }])
      }
      if (!telegramfunc.length){
          bot.sendMessage(user,tran[14][po])
            return
          }
      var tele = {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        reply_markup: {
        inline_keyboard: telegramfunc
      }}
      
      bot.sendMessage(user, tran[12][po], tele)
      
      
    }
  })
  })
}

// //bot.sendMessage(456192909, '`
	//			00: 25 ` Ⓗ Schillerplatz\n 🚋  6 Niedersedlitz\n`
		//		01: 45 ` Ⓗ Postplatz', {
//         parse_mode: 'Markdown',
//         disable_web_page_preview: true})
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});