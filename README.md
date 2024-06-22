## Amazon Price and Limited Stock Alerts Checker

### Credits
The Captcha solver is from [Anatolii's Amazon Captcha Solver](https://github.com/a-maliarov/amazoncaptcha)

### Setup
**Depenencies**
This script requires NodeJS and Python 3+

To install all dependencies run
1. npm i
2. pip install -r requirements.txt

**Config**
If you want email alerts, create a .env file and add the following contents
```
EMAIL=
PASSWORD=
HOST=
```
- Host is your SMTP server
- Email is your SMTP username
- Password is your SMTP password

Inside of the index.js file modify lines 9-13 as needed.

### Running The Program
Simply run `node index.js` and the program will run. In the case your are greeted with a Captcha from amazon, the program will spawn a python script that will solve the captcha.

