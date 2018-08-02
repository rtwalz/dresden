# Dresden Bot
Telegram bot for the DVB and VVO transit network in Dresden, Germany. Try it now at [t.me/dresdenbot](https://t.me/dresdenbot)
 ### How does it work?
The bot uses the DVB mobile website's API to get real-time departures from specific stops, and to use the trip planner to get from one stop to another. The code is really messy and probably isn't readable, I made this quickly and copy and pasted a lot of code, there's duplicate code everywhere... :)
 ### What does it do?
Many things. Here's a list:
- Departure board for specific stops
- Routing between point A and B
- Network maps from around Dresden
- Line maps using the i-MetrO website
- Multi-language support (German and English)

Here are things I'll add, if I have time:
- Send location using Telegram to get departures at that stop
- Saved stops from an inline keyboard
- Send a map image from a specfic stop using VVO's PDF api
 ### Acknowledgements
Thank you to:
- [@maaaaaaaaarv](https://twitter.com/maaaaaaaaarv) for donating the awesome Telegram username and for translating the bot into German
- [Glitch](https://glitch.com) for the free Node hosting
- [kiliankoe/vvo](https://github.com/kiliankoe/vvo) for documentation and a great set of information on the API options for VVO and DVB
