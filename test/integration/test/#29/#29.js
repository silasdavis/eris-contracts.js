'use strict';

var
  assert = require('assert'),
  createDb = require('../../createDb'),
  erisContracts = require('../../../../'),
  Promise = require('bluebird'),
  Solidity = require('solc'),
  fs = require('fs');

var dbUrl, accountData, contractManager, contract;

var  announceEvents = true;

var sub = function(err, subObj){};

var setup2 = function(done){

  createDb().spread(function (url, validator) {

    dbUrl = url;

    accountData = {
      address: validator.address,
      pubKey: validator.pub_key,
      privKey: validator.priv_key
    };

    contractManager = erisContracts.newContractManagerDev(dbUrl, accountData);
    done()
  })
}

var setup = function(done) {
  dbUrl = "http://localhost:1337/rpc";
  var privValidatorPath = process.env.HOME + "/.eris/chains/myChain/priv_validator.json"
  var fs = require('fs');
  var privValidator = JSON.parse(fs.readFileSync(privValidatorPath));

  accountData = {
    address: privValidator.address,
    pubKey: privValidator.pub_key[1],
    privKey: privValidator.priv_key[1]
  };

  console.log(accountData)

  contractManager = erisContracts.newContractManagerDev(dbUrl, accountData);
  done()
}

var deploy = function(source, done){
  var compiled = Solidity.compile(source).contracts.GS_event;

  var abi = JSON.parse(compiled.interface);
  var bytecode = compiled.bytecode;
  var contractFactory = contractManager.newContractFactory(abi);
  contractFactory.setOutputFormatter(erisContracts.outputFormatters.jsonStrings)

  contractFactory.new({data: bytecode}, function (error, newContract) {
    assert.ifError(error);
    contract = newContract;
    done();
  });
}



describe("Event and transaction testing", function(){
  this.timeout(10000)
  before(setup)

  describe("Bare Get Set contract with no Events", function(){

    before(function(done){
      var source = fs.readFileSync(__dirname + '/GS_event1.sol').toString();
      deploy(source, done)
    })

    it('Should be initialized to 42', function(done){
      contract.get(function(err, data){
        assert.equal(data.values.value, '42');
        done()
      })
    })

    it('Should return non-zero errorcode is wrong secret provided', function(done){
      contract.set(0, 88, function(err, data){
        assert.equal(data.values.ECODE, 9999);
        done()
      })
    })

    it('Should return 0 errorcode and have the proper value set', function(done){
      contract.set(16, 88, function(err, data){
        assert.equal(data.values.ECODE, 0);
        contract.get(function(err, data){
          assert.equal(data.values.value, '88');
          done()
        })
      })
    })
  })




  describe("Get Set with event defined but not used and event NOT subscribed to", function(){
    var eventVal = 0;
    before(function(done){
      var source = fs.readFileSync(__dirname + '/GS_event2.sol').toString();
      deploy(source, function(){
        done()
      })
    })

    it('Should be initialized to 42', function(done){
      contract.get(function(err, data){
        assert.equal(data.values.value, '42');
        done()
      })
    })

    it('Should return non-zero errorcode is wrong secret provided', function(done){
      contract.set(0, 88, function(err, data){
        assert.equal(data.values.ECODE, 9999);
        done()
      })
    })

    it('Should return 0 errorcode and have the proper value set', function(done){
      contract.set(16, 88, function(err, data){
        assert.equal(data.values.ECODE, 0);
        contract.get(function(err, data){
          assert.equal(data.values.value, '88');
          done()
        })
      })
    })
  })



  describe("Get Set with event defined but not used and event IS subscribed to", function(){
    var eventVal = 0;
    before(function(done){
      var source = fs.readFileSync(__dirname + '/GS_event2.sol').toString();
      deploy(source, function(){
        contract.setted(sub, function(err, data){
          if(announceEvents) {
            console.log("A setted Event has occurred")
            console.log(data)
            console.log("----------------------------")
          }
          eventVal = data.values.value;
        })
        done()
      })
    })

    it('Should be initialized to 42', function(done){
      contract.get(function(err, data){
        assert.equal(data.values.value, '42');
        done()
      })
    })

    it('Should return non-zero errorcode is wrong secret provided', function(done){
      contract.set(0, 88, function(err, data){
        assert.equal(data.values.ECODE, 9999);
        done()
      })
    })

    it('Should return 0 errorcode and have the proper value set', function(done){
      contract.set(16, 88, function(err, data){
        assert.equal(data.values.ECODE, 0);
        contract.get(function(err, data){
          assert.equal(data.values.value, '88');
          assert.equal(eventVal, 0)
          done()
        })
      })
    })
  })



  describe("Get Set with event defined AND used but event is NOT subscribed to", function(){
    var eventVal = 0;
    before(function(done){
      var source = fs.readFileSync(__dirname + '/GS_event3.sol').toString();
      deploy(source, function(){
        done()
      })
    })

    it('Should be initialized to 42', function(done){
      contract.get(function(err, data){
        assert.equal(data.values.value, '42');
        done()
      })
    })

    it('Should return non-zero errorcode is wrong secret provided', function(done){
      contract.set(0, 88, function(err, data){
        assert.equal(data.values.ECODE, 9999);
        done()
      })
    })

    it('Should return 0 errorcode and have the proper value set', function(done){
      contract.set(16, 88, function(err, data){
        assert.equal(data.values.ECODE, 0);
        contract.get(function(err, data){
          assert.equal(data.values.value, '88');
          assert.equal(eventVal, 0)
          done()
        })
      })
    })
  })



  describe("Get Set with event defined AND used and event IS subscribed to", function(){
    this.timeout(30000)
    var eventVal = 0;
    before(function(done){
      var source = fs.readFileSync(__dirname + '/GS_event2.sol').toString();
      deploy(source, function(){
        contract.setted(sub, function(err, data){
          if(announceEvents) {
            console.log("A setted Event has occurred")
            console.log(data)
            console.log("----------------------------")
          }
          eventVal = data.values.value;
        })
        done()
      })
    })

    it('Should be initialized to 42', function(done){
      contract.get(function(err, data){
        assert.equal(data.values.value, '42');
        done()
      })
    })

    it('Should return non-zero errorcode is wrong secret provided', function(done){
      contract.set(0, 88, function(err, data){
        assert.equal(data.values.ECODE, 9999);
        done()
      })
    })

    it('Should return 0 errorcode and have the proper value set', function(done){
      contract.set(16, 88, function(err, data){
        assert.equal(data.values.ECODE, 0);
        contract.get(function(err, data){
          assert.equal(data.values.value, '88');
          setTimeout(function() {
            assert.equal(eventVal, 88)
            done()
          }, 10000);
        })
      })
    })
  })


})
