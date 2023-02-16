function getRandomInt(max) {
    return Math.floor(Math.random() * max);
  }

function createOrderId(){
  const result = Math.random().toString(36).substring(2, 7);
  const id = Math.floor(100000 + Math.random() * 900000);
  return result+id
}
  
  module.exports ={
    getRandomInt,
    createOrderId,
  } 