# urls

The tool is developed by @manishcencha to generate short URLs for input URLs.

See demo at: <a href="https://m-urlshortener.herokuapp.com" target="_blank">https://m-urlshortener.herokuapp.com</a>.

## Usage

Usage instructions:
<ul>
  <li>In the text field enter the URL to which you want to short</li>
  <li>Click on <code>Short</code></li>
  <li>The short URL will be in the last of the below list.</li>
</ul>

## Installation Instructions 

### Prerequisites
You should have installed:
<ul>
  <li>nodejs</li>
  <li>npm</li>
  <li>mongodb</li>
</ul>

If you have installed the prerequisites, follow these steps:
<ul>
  <li>Clone the repository <code>git clone https://github.com/xyberty/urls.git</code></li>
  <li>Navigate to the directory <code>cd urls</code></li>
  <li>Run the command <code>npm install</code> or <code>npm i</code> to install the dependencies</li>
  <li>Inside the <code>urls</code> directory create a <code>.env</code> file and put your mongodb URL into it <code>DB_URL="URL"</code></li>
  <li>Now everything is ready. Run the command <code>npm run runDev</code> to start the server.</li>
  <li>Now open your browser and go to the URL <code>http://localhost:3000</code></li>
  <li>You are good to go.</li>
</ul>
