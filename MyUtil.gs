// Utilクラス

// Isbn13->Isbn10に変換
function toIsbn10(isbn13){
  
  var temp_str = String(isbn13);
  
  //step1
  temp_str = temp_str.slice(3);
  temp_str = temp_str.slice(0,-1);
  //Logger.log(temp_str);
  
  var temp_str_array = temp_str.split('');
  //Logger.log(temp_str_array);
  
  var checkdegit = 0;
  
  //step2 
  for(var i=0; i<(temp_str_array.length);i++){
    var keta = Number(temp_str_array[i]);
    checkdegit += keta * (10 - i);
  }
  
  //step 3
  checkdegit = checkdegit%11;
  
  //step 4
  checkdegit = 11 - checkdegit;
  
  //step5
  if(checkdegit == 11){
    checkdegit = 0;
  }else if(checkdegit == 10){
     checkdegit = "X";
  }
    
  temp_str_array.push(checkdegit);
  temp_str = temp_str_array.join('');
  //Logger.log(temp_str);
  
  return temp_str;
}

//isbn10->isbn13に変換
function toIsbn13(isbn10){
  
  var temp_str = String(isbn10);
  
  //step1
  temp_str = "978" + temp_str; 
  temp_str = temp_str.slice(0,-1)
  //Logger.log(temp_str);
  
  var temp_str_array = temp_str.split('');
  //Logger.log(temp_str_array);
  
  var checkdegit = 0;
  
  //step2 // checkdegit桁は計算に含めないので-1する
  for(var i=0; i<(temp_str_array.length);i++){
    var keta = Number(temp_str_array[i]);
    
    if( i%2 == 0){
      checkdegit += keta * 1;
    }else{
      checkdegit += keta * 3;
    }    
  }
  
  //step 3
  checkdegit = checkdegit%10;
  
  //step 4
  checkdegit = 10 - checkdegit;
  
  //step5
  if(checkdegit == 10){
    checkdegit = 0;
  }
    
  Logger.log(temp_str_array);
  
  temp_str_array.push(checkdegit);
  temp_str = temp_str_array.join('');
  //Logger.log(temp_str);
  
  return temp_str;
  
}

//テスト実施コード

function test_toIsbn10(){
  Logger.log("4047346314 = " + toIsbn10(9784047346314));
}

function test_toIsbn13(){
  Logger.log("9784047346314 = " + toIsbn13(4047346314));
}