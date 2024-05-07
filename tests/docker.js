const axios = require('axios')
const ports = "8080:3000,9000:5900";
(async () =>{
let header = {
    'Content-Type': 'application/json',
    'Authorization':'Bearer default_key',
    'image':'ubuntu',
    'name':"ayyoo",
    'memory':1024,
    'cpu':1,
    'ports': '8080:8080,2000:2000'
}
const RequestData = {
    method: 'post',
    url: `http://localhost:3000/server/api/create`,
    headers: header
  };
  try {
    const response = await axios(RequestData);
    console.log(response.data)
  }catch(er){
    console.log('Error creating container')
    console.log(er)
  }
})()
