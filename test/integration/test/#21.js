'use strict';

var
  assert = require('assert'),
  createDb = require('../createDb'),
  erisContracts = require('../../../'),
  Promise = require('bluebird'),
  Solidity = require('solc');

function compile(source) {
  var
    output;

  output = Solidity.compile(source);

  if ('errors' in output)
    throw Error(output.errors);
  else
    return output.contracts;
}

describe("strings are encoded and decoded properly", function () {
  var
    contract;

  before(function (done) {
    var
      dbPromises, source, compiled;

    this.timeout(10 * 1000);

    dbPromises = createDb();

    source = '\
      contract c { \
        function getBytes() constant returns (byte[10]){ \
            byte[10] memory b; \
            string memory s = "hello"; \
            bytes memory sb = bytes(s); \
            \
            uint k = 0; \
            for (uint i = 0; i < sb.length; i++) b[k++] = sb[i]; \
            b[9] = 0xff; \
            return b; \
        } \
        \
        function deeper() constant returns (byte[12][100] s, uint count) { \
          count = 42; \
          return (s, count); \
        } \
      } \
    ';

    compiled = compile(source).c;

    Promise.all(dbPromises).spread(function (hostname, port, validator) {
      var
        dbUrl, accountData, contractManager, abi, bytecode,
        contractFactory;

      dbUrl = "http://" + hostname + ":" + port + "/rpc";

      accountData = {
        address: validator.address,
        pubKey: validator.pub_key,
        privKey: validator.priv_key
      };

      contractManager = erisContracts.newContractManagerDev(dbUrl, accountData);
      abi = JSON.parse(compiled.interface);
      bytecode = compiled.bytecode;
      contractFactory = contractManager.newContractFactory(abi);

      contractFactory.new({data: bytecode}, function (error, newContract) {
        assert.ifError(error);
        contract = newContract;
        done();
      });
    });
  });

  it("gets the static byte array decoded properly", function (done) {
    contract.getBytes(function (error, bytes) {
      assert.ifError(error);

      assert.equal(bytes,
          ['68', '65', '6C', '6C', '6F', '00', '00', '00', '00', 'FF']);

      done();
    });
  });

  it("returns multiple values correctly from a function", function (done) {
    contract.deeper(function (error, values) {
      assert.ifError(error);
      console.dir(values);
      assert.equal(values[1], 42);
      done();
    });
  });
});
