/** @format */

const { Builder, By, until, WebElement } = require("selenium-webdriver");
const nodemailer = require("nodemailer");
const fs = require("fs");
const { spawn } = require("child_process");
require("dotenv").config();

const url =
  "https://www.amazon.ca/MG-Chemicals-Premium-Polyurethane-Conformal/dp/B06XC3JBVJ/ref=sr_1_3?crid=34YTYVJHEDPVC&dib=eyJ2IjoiMSJ9.ZYOdZvKVdlXoJrx58F2tq9EiDvNcv8wYN16UNkoqLJJV0SZmfsTGfLGIXkQPUATlNAmaxO9oAp3oWkc96yb7vr4m1O7EILo6UYk1pDdnUjKivDV1jwFfSYxHwEf8fRfngRd5HTfR_uIxKsQi8g0-IfFVNgQM0wEIyCDxMM03egW5PX78hMUMV5QYuu4v70FIbvH8BEyDj38vXx5VNPpCsNGvDc8aBXbi73wgJyzqTkddyMRW9z_gFIS6-OvAQG0tQlkdZH5_WOoQNVeYBx42NX7JfQjLRe0NnCXBpnTjd3E.yi-FXlC9NlsZaMEbJptLDi2bUItOi9GW8vO2uSt9OGQ&dib_tag=se&keywords=conformal+coating&qid=1719015986&sprefix=conformal+coatin%2Caps%2C107&sr=8-3";
const toEmail = "your-email@example.com"; // Replace with your email for notifications
const toName = "Your Name"; // Replace with your name so emails don't go to spam
const itemId = "Taylor Swift CDs"; // a unique name or id for the item being tracked

const transporter = nodemailer.createTransport({
  host: process.env.HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

/**
 *
 * @param {WebElement} form
 */
const solveCaptcha = async (form) => {
  const captchaImage = await form.findElement(By.xpath("//img"));

  // take screenshot of captcha image and save it to disk
  const image = await captchaImage.takeScreenshot();

  const imageId = Math.floor(Math.random() * 1000);
  fs.writeFileSync(`captcha-${imageId}.png`, image, "base64");

  // run python script to solve captcha and get output
  const python = spawn("python3", [
    "captchasolver.py",
    `captcha-${imageId}.png`,
  ]);

  const text = await new Promise((resolve, reject) => {
    python.stdout.on("data", (data) => {
      resolve(data.toString());
    });

    python.stderr.on("data", (data) => {
      reject(data.toString());
    });
  });

  // get input with type text
  const input = await form.findElement(By.xpath("//input [@type='text']"));

  await input.sendKeys(text);

  // delete captcha image
  fs.unlinkSync(`captcha-${imageId}.png`);
};

// Function to check stock status
async function checkStock() {
  let driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions()
    .build();

  try {
    await driver.get(url);

    // Detect captcha form
    const captchaForm = await driver.findElements(
      // locate form element
      By.xpath("//form[@action='/errors/validateCaptcha']") // xpath to locate captcha form
    );

    if (captchaForm.length > 0) {
      await solveCaptcha(captchaForm[0]);
    }

    await driver.wait(until.elementLocated(By.className("a-box-group")));

    const bodyText = await driver
      .findElement(By.className("a-box-group"))
      .getText();

    const priceWhole = await driver
      .findElement(By.className("a-box-group"))
      .findElement(By.className("a-price-whole"))
      .getText();

    const priceFraction = await driver
      .findElement(By.className("a-box-group"))
      .findElement(By.className("a-price-fraction"))
      .getText();

    if (bodyText.includes("left in stock")) {
      console.log("limited stock available");
    }

    const price = priceWhole + "." + priceFraction;
    const priceNumber = parseFloat(price);

    return {
      limitedStock: bodyText.includes("left in stock"),
      price: priceNumber,
    };
  } catch (error) {
    console.error("Error checking stock:", error);
  } finally {
    // await driver.quit();
  }
}

// Function to send email alert
function sendEmailAlert(subject, text) {
  const mailOptions = {
    from: process.env.EMAIL,
    to: toEmail,
    subject: subject,
    text: text,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.error("Error sending email:", error);
    }
    console.log("Email sent:", info.response);
  });
}

// Schedule the check to run every hour
// cron.schedule("0 * * * *", () => {
//   console.log("Checking stock status...");
//   checkStock();
// });

// Initial check

let oldPrice = -1;

async function run() {
  const { limitedStock, price } = await checkStock();

  console.log({
    limitedStock,
    price,
  });

  if (oldPrice !== -1 && oldPrice !== price) {
    console.log("##### Price changed #####");
    const now = new Date();
    const date = now.toDateString();
    const time = now.toTimeString();
    console.log(`Date: ${date}, Time: ${time}`);
    console.log(`Old price: ${oldPrice}, New price: ${price}`);

    sendEmailAlert(
      "Price Change Alert",
      `Hi ${toName},\n\nThe price for item ${itemId} has changed from $${oldPrice} to $${price}.
      \n\nDate: ${date}, Time: ${time}`
    );
  }

  if (!limitedStock) {
    console.log("Item has limited stock");
    sendEmailAlert(
      "Item Limited Stock Alert",
      `Hi ${toName},\n\nThe item ${itemId} has limited stock available.`
    );
  }

  oldPrice = price;

  const FOUR_HOURS = 1000 * 60 * 60 * 4;
  setTimeout(run, FOUR_HOURS);
}

run();
