//
//  Wallets.swift
//  ContractInterface
//
//  Created by Quincy Jones on 12/28/22.
//
import Combine
import SwiftUI
import web3swift
import Core
import BigInt
import CryptoSwift
import CodeScanner
//import XDC3Swift
//https://cocoapods.org/pods/web3swift#projects-that-are-using-web3swift
//https://api.coingecko.com/api/v3/simple/price?ids=xdce-crowd-sale&vs_currencies=usd


//MARK: Web3 class
struct MyWeb3Provider: Web3Provider {
    var network: Networks?
    var attachedKeystoreManager: KeystoreManager?
    var policies: Policies
    var url: URL
    var session: URLSession

    init(url: URL) {
        self.url = url
        self.network = nil
        self.attachedKeystoreManager = nil
        self.policies = .auto
        self.session = .init(configuration: .default)
    }
}

struct CoinPrice: Decodable {
    let xdceCrowdSale: [String: Double]

    enum CodingKeys: String, CodingKey {
        case xdceCrowdSale = "xdce-crowd-sale"
    }
}

class CoinPriceViewModel: ObservableObject {
    @Published var price: Double = 0

    private var cancellable: AnyCancellable?

    init() {}

    func fetchPrice(priceFeed:String) {
        cancellable = URLSession.shared.dataTaskPublisher(for: URL(string: priceFeed)!)
            .map { $0.data }
            .decode(type: CoinPrice.self, decoder: JSONDecoder())
            .map { $0.xdceCrowdSale["usd"] ?? 0 }
            .replaceError(with: 0)
            .receive(on: DispatchQueue.main)
            .assign(to: \.price, on: self)
    }
}

class Web3wallet: ObservableObject {
    
    @Published var walletTotal: BigUInt = 0
    @Published var rpc:String = "http://127.0.0.1:8545"
    var clientUrl:String = ""
    init() {
        Task{
            var walletAddy  = createWallet(seed: "1234")
            print("Addresses -- User")
//            print(walletAddy)
//            //print(await Send(from: "0xD69B4e5e5A7D5913Ca2d462810592fcd22F6E003", value: 10, to: "0xCc3ec4D393e9879786aF9F213098b88893A0beA8"))
            //print( await nameXRC20(contractAddress: "0x8fBf99110408C29d0E2fe19B58B39b2078b6B87b", address: "0xD69B4e5e5A7D5913Ca2d462810592fcd22F6E003"))
//            print( await symbolXRC20(contractAddress: "0x8fBf99110408C29d0E2fe19B58B39b2078b6B87b", address: "0xD69B4e5e5A7D5913Ca2d462810592fcd22F6E003"))
//            print( await balanceXRC20(contractAddress: "0x8fBf99110408C29d0E2fe19B58B39b2078b6B87b", address: "0xD69B4e5e5A7D5913Ca2d462810592fcd22F6E003"))
            await checkAddresTxn(address: "0xD69B4e5e5A7D5913Ca2d462810592fcd22F6E003")
//            await retrieveLocalAccounts()
        }
    }
    var XRC20abi:String = """
[
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "name": "balance",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_to",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "_from",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "_to",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  }
]

"""
    func changeRPC(RPC:String){
        rpc = RPC
    }
    func sendXRC20(contractAddress:String,from:String,value:BigInt,to:String) async{
        await WriteDApp(abiString: XRC20abi, ContractAddress: contractAddress, Function: "transfer", param: [to,String(value)], from: from)
    }
    func balanceXRC20(contractAddress:String,address:String) async ->String{
        return await ReadDApp(abiString: XRC20abi, ContractAddress: contractAddress, Function: "balanceOf", param: [address], from: address)
    }
    func nameXRC20(contractAddress:String,address:String) async ->String{
        return await ReadDApp(abiString: XRC20abi, ContractAddress: contractAddress, Function: "name", param: [], from: address)
    }
    func symbolXRC20(contractAddress:String,address:String) async ->String{
        return await ReadDApp(abiString: XRC20abi, ContractAddress: contractAddress, Function: "symbol", param: [], from: address)
    }
    //check
    func checkAddresTxn(address:String) async ->([String],Int){
        let web3 = RPC(RPC: rpc)
        guard let transactionCount = try? await web3?.eth.getTransactionCount(for: EthereumAddress(from: address)!) else {
            print("txn count error")
            return (["Error"],0)
        }
        print("transaction count \(transactionCount)")
        // Retrieve the details of each transaction
        for i in 0..<transactionCount {
            do {
                let transaction = try await web3!.eth.transactionDetails(i.serialize())
                print(transaction.transaction.description.base58EncodedString)
                let next = try await web3!.eth.transactionReceipt(transaction.transaction.hash ?? Data())
                print("see this")
                print(transaction.blockHash)
                print(transaction.blockNumber)
            } catch {
                print("Error getting transaction details: \(error)")
            }
        }
        
        return ([""],Int(transactionCount))
    }
    //check
    func createWallet(seed: String) -> String {
        do {
            let keystore = try EthereumKeystoreV3(password: seed)
            
            let keydata = try! JSONEncoder().encode(keystore?.keystoreParams)
            let keystoreString = String(data: keydata, encoding: .utf8)

            print("Keystore: \(keystoreString!)")

            let address = keystore?.addresses![0]
            keystore?.isHDKeystore = true
            keystore?.keystoreParams?.isHDWallet = true
            print("Address: \(address?.address)")
            return address?.address ?? "Error"
        } catch {
            print("Error creating wallet: \(error)")
            return ""
        }
    }

    func RPC(RPC:String = "http://127.0.0.1:8545") -> Web3? {
        var provider = MyWeb3Provider(url: URL(string: RPC)!)
        //var provider = URL(string: "http://localhost:8545") as! Web3Provider
        let web3 = Web3(provider: provider)
        //print(self.web3Provider.url)
        return web3
    }
    
    func getBalanceTotal(address: String) async -> BigUInt{
        let web3 = RPC(RPC: rpc)
        guard let address = EthereumAddress(address) else { return 0 }
        guard let balance = try! await web3?.eth.getBalance(for: address) else { return 0 }
        print("getBalance: \(balance)")
        return balance
    }
    
    func retrieveLocalAccounts() async -> [String] {
        do {
            let web3 = RPC(RPC: rpc)
            guard let accounts = try await web3?.eth.ownedAccounts() else { return [] }
            let addressesString = accounts.map { $0.address }
            print(addressesString)
            return addressesString
        } catch {
            print("Error getting accounts: \(error)")
        }
        return []
    }

    func Send(from:String,value:BigUInt,to:String) async -> String{
        let web3 = RPC(RPC: rpc)
        let keystore = try! EthereumKeystoreV3("1234")
        let wallet = try keystore?.addresses
        
        var transaction: CodableTransaction = .emptyTransaction

        //let options = TransactionOptions.defaultOptions
        transaction.from = EthereumAddress(from, type: .normal)
        guard let toAddress = EthereumAddress(to, type: .normal) else {
            print("Send Failed")
            return "Error"
        }
        
        //let nonce = try await web3?.eth.getTransactionCount(for: EthereumAddress(from, type: .normal) ?? <#default value#>)
        if let address = EthereumAddress(from, type: .normal) {
            let nonce = try! await web3?.eth.getTransactionCount(for: address)
                transaction.nonce = nonce ?? 0
        } else {
            transaction.nonce = 0
            print("Failed to get nonce")
        }
        transaction.to = toAddress
        transaction.value = value
        transaction.gasLimit = BigUInt(6721975)
        transaction.gasPrice = BigUInt(20000000000)

        do {
            var submit = try await web3?.eth.send(transaction)
            let transactionHash = submit?.transaction.hash ?? Data()
            if let transactionHash = submit?.transaction.hash {
                return submit?.hash ?? "Error"
            }
            print("Send function executed")
        } catch {
            print("Send Failed to deploy: \(error)")
        }
        return "Error"
    }
    
    func abiConverter(from string: String) -> String {
        let updatedString = string.replacingOccurrences(of: "@", with: "\"")
        return updatedString
    }
    
    func ReadDApp(abiString:String,ContractAddress:String,Function:String,param:[String],from:String) async -> String{
        let web3 = RPC(RPC: rpc)!
        let contractAddress = EthereumAddress(ContractAddress, type: .normal)
        let keystore = try! EthereumAddress(from, type: .normal)
        var AbiString = abiConverter(from: abiString)
        
        let contract = Web3.Contract(web3: web3, abiString: AbiString, at: contractAddress)!
        let readTransaction = contract.createReadOperation (Function, parameters:param as [AnyObject])!
        readTransaction.transaction.from = keystore
        let response = try! await readTransaction.callContractMethod()
        
        var balance: String?

        if let balanceBigUInt = response["0"] as? BigUInt {
            balance = balanceBigUInt.description
        } else if let balanceString = response["0"] as? String {
            balance = balanceString
        } else if let balanceBigInt = response["0"] as? BigInt {
            balance = balanceBigInt.description
        } else if let balanceBool = response["0"] as? Bool {
            balance = String(balanceBool)
        }
        
        print (balance!.description)
        print(response)
        return balance!.description
    }

    func WriteDApp(abiString:String,ContractAddress:String,Function:String,param:[String],from:String) async -> String{
        let web3 = RPC(RPC: rpc)!
        let contractAddress = EthereumAddress(ContractAddress, type: .normal)
        let keystore = try! EthereumAddress(from, type: .normal)
        var AbiString = abiConverter(from: abiString)
        
        let contract = Web3.Contract(web3: web3, abiString: AbiString, at: contractAddress)!
        let readTransaction = contract.createWriteOperation (Function, parameters:param as [AnyObject])!
        readTransaction.transaction.from = keystore
        let response = try! await readTransaction.callContractMethod()
        
        //let balance = response["0" ] as? String
        
        var balance: String?

        if let balanceBigUInt = response["0"] as? BigUInt {
            balance = balanceBigUInt.description
        } else if let balanceString = response["0"] as? String {
            balance = balanceString
        } else if let balanceBigInt = response["0"] as? BigInt {
            balance = balanceBigInt.description
        } else if let balanceBool = response["0"] as? Bool {
            balance = String(balanceBool)
        }
        
        print (balance!.description)
        print(response)
        return balance!.description
    }
}

//MARK: All_Wallets
struct All_Wallets:Identifiable{
    let id: String = UUID().uuidString
    let address:String
    var total:Int
    let network:String
    let keyNumber:Int
    let encryptedKey:String
}

extension Wallets{
    //BigUInt -> Double
    func formatAndConvert(bigUint: BigUInt) -> Double {
        let formattedString = String(bigUint / BigUInt(1e18)) + "." + String(bigUint % BigUInt(1e18))
        let double = Double(formattedString)
        let truncatedDouble = Double(String(format: "%.4f", double!))
        return truncatedDouble!
    }
    //Double -> BigUInt
    func inverseFormatAndConvert(double: Double) -> BigUInt {
        let string = String(double)
        let parts = string.split(separator: ".")
        let left = BigUInt(parts[0])! * BigUInt(1e18)
        let right = BigUInt(parts[1])! * BigUInt(1e17)
        print("left right: \(left + right)")
        return left + right
    }
}

//MARK: Wallets
struct Wallets: View {
    @State private var isComplete:Bool = false
    @State private var isPassed:Bool = false
    @State private var sendto:String = ""
    @State private var sendAmount:String = ""
    @State private var SendComplete:Bool = false
    @State private var fiatConvert:Int = 0
    @AppStorage("developerMode") private var developerMode:Bool = false
    @State private var settingsPage:Bool = false
    
    //@State var currentWallet = "0xD69B4e5e5A7D5913Ca2d462810592fcd22F6E003"
    @AppStorage("currentWallet") var currentWallet = ""
    @State private var selectWalletView:Int = 0
    
    @State private var txnHash:String = ""
    
    @StateObject var web3 = Web3wallet()
    
    @ObservedObject private var coinPriceViewModel = CoinPriceViewModel()

    @State private var selectedWallet:String = ""
    @State private var selectedNetwork:String = ""
    @State private var isPresentingScanner = false
    @State private var scannedCode: String = "Send To"
    
    @State var networkSymbol:String
    @AppStorage("networkrpc") private var networkrpc:String = ""
    @State private var localAcounts:[String] = []
    //MARK: body
    var body: some View {
        ZStack{
            userWallet
        }.onAppear{
            if let (name, symbol, rpcPrimary, priceFeed) = parseNetworkInfo(symbol: networkSymbol, network: .primary) {
                coinPriceViewModel.fetchPrice(priceFeed: priceFeed)
                networkSymbol = symbol
                networkrpc = rpcPrimary
                web3.rpc = rpcPrimary
            }
            Task{
                localAcounts =  await web3.retrieveLocalAccounts()
                if localAcounts.count != 0{
                    currentWallet = localAcounts[0]
                    web3.walletTotal = await web3.getBalanceTotal(address: currentWallet)
                }else {
                    currentWallet = "0xD69B4e5e5A7D5913Ca2d462810592fcd22F6E003"
                }
            }
        }
    }
    
    //MARK: userWallet
    var userWallet: some View{
        VStack {
            if(selectWalletView != 2){
                ZStack{
                    Circle()
                        .foregroundColor(.clear)
                        .scaledToFit()
                        .frame(width: 120)
                    
                }.overlay{
                    Image(networkSymbol)
                        .resizable()
                        .scaledToFit()
                }
               
            Text(networkSymbol)
            Text(String(formatAndConvert(bigUint: web3.walletTotal)))
                .font(.largeTitle)
                .bold()
                .onAppear{
                    Task{
                        web3.walletTotal = await web3.getBalanceTotal(address: currentWallet)
                    }
                }
            
                Text("$\(coinPriceViewModel.price * formatAndConvert(bigUint:web3.walletTotal), specifier: "%.3f")")
                .font(.caption)
                .bold()
        }
            HStack{
                Button(action: {
                    selectWalletView = 1
                }, label: {
                    Image(systemName: "qrcode")
                        .padding(20)
                        .background(Color.blue)
                        .cornerRadius(50)
                })
                Spacer()
                    changeSettings
                Spacer()
                        .padding(.top)
                Button(action: {
                    selectWalletView = 2
                }, label: {
                   Image(systemName: "paperplane.fill")
                        .padding(20)
                        .background(Color.blue)
                        .cornerRadius(50)
                })
            }
            .padding(.horizontal,100)
            .padding()
            
            
            Text(currentWallet)
                .font(.footnote)
                .bold(selectWalletView == 2 ? true:false)
                .padding()
                .frame(maxWidth: .infinity)
                .background(selectWalletView == 2 ? Color.gray:Color.clear)
                .cornerRadius(10)
                .padding(.horizontal)
            
            Spacer()
            
            switch selectWalletView {
            case 0:
                list
            case 1:
                wallletQR
                Spacer()
            case 2:
                sendCrypto
            default:
                list
            }
    }
}

    //MARK: list
    var list:some View{
        List{
            if(settingsPage){
                Section(header: Text("Network")) {
                    Picker("Network", selection: $selectedNetwork) {
                        ForEach(extractNamesAndSymbols(jsonString: networkRPCs)?.symbols ?? [], id: \.self) { symbol in
                            Text(symbol).tag(symbol)
                        }
                        .onChange(of: selectedNetwork) { newValue in
                            if let (name, symbol, rpcPrimary, priceFeed) = parseNetworkInfo(symbol: newValue, network: .primary) {
                                coinPriceViewModel.fetchPrice(priceFeed: priceFeed)
                                networkSymbol = symbol
                                networkrpc = rpcPrimary
                                web3.changeRPC(RPC: rpcPrimary)
                                print("RPC")
                                print(rpcPrimary)
                                print(web3.rpc)
                                Task{
                                    localAcounts =  await web3.retrieveLocalAccounts()
                                    currentWallet = localAcounts[0]
                                    web3.walletTotal = await web3.getBalanceTotal(address: currentWallet)
                                }
                            }
                        }
                    }
                    HStack {
                        Text("RPC:")
                        Spacer()
                        Text(networkrpc)
                    }
                    Toggle("Developer Mode", isOn: $developerMode)
                    if developerMode {
                        
                    }
                }
            } else {
                Section("Wallet"){
                    HStack {
                        Picker("Wallet", selection: $selectedWallet) {
                            ForEach(localAcounts, id: \.self) { account in
                                Text(account).tag(account)
                                    .font(.caption)
                            }
                        }
                        .onChange(of: selectedWallet) { newValue in
                            print("Test")
                            currentWallet = newValue
                            Task{
                                web3.walletTotal = await web3.getBalanceTotal(address: currentWallet)

                            }
                        }
                    }
                    NavigationLink(destination: transactionHistory) {
                        Text("Transaction History")
                    }
                }
                Section("Tokens"){
                    HStack{
                        switch networkSymbol{
                        case "XDC":
                            ForEach(xdcNetworkContracts, id: \.self) { contract in
                                ContractRow(contract: contract)
                            }
                        case "Ganache":
                            ForEach(ganachehNetworkContracts, id: \.self) { contract in
                                ContractRow(contract: contract)
                            }
                        default:
                            ForEach(xdcNetworkContracts, id: \.self) { contract in
                                ContractRow(contract: contract)
                            }
                        }
                    }
                }
                .onAppear{
                    
                }
            }
        }.listStyle(.grouped)
    }

    
    var changeSettings: some View{
        Button(action: {
            settingsPage.toggle()
        }, label: {
            Image(systemName: "gear")
                 .padding(20)
                 .background(Color.blue)
                 .cornerRadius(50)
        })
        //.background(newDapplet ? Color.red:Color.blue)

    }
    
    //MARK: transactionHistory
    var transactionHistory: some View {
        ZStack{
            VStack{
                List{
                    Section("Transaction History"){
                        NavigationLink(destination: Text("About Txn History")) {
                            HStack{
                                VStack{
                                    Circle()
                                        .frame(width: 30)
                                    Text("XDC")
                                }
                                Spacer()
                                
                                VStack(alignment: .leading){
                                    Text("Complete")
                                        .foregroundColor(.green)
                                    Text("xdce64996f74579ed41674a26216f8ecf980494dc38")
                                        .font(.caption)
                                }
                                Spacer()
                                VStack{
                                    HStack{
                                        Text("-")
                                        Text("10,243")
                                        Text("XDC")
                                    }
                                    Text("11/22/22-15:29")
                                        .font(.caption)
                                }
                            }
                        }
                    }
                }
                .listStyle(.grouped)
            }
        }
    }
    //MARK: walletQR
    var wallletQR:some View{
        VStack{
            Button(action: {
                selectWalletView = 0
            }) {
                
                Image(uiImage: UIImage(data: getQRCodeDate(text: currentWallet)!)!)
                    .resizable()
                    .frame(width: 300, height: 300)
            }
        }
    }
    //MARK: sendCrypto
    var sendCrypto:some View{
        
        
        VStack{
            switch SendComplete {
            case true:
                List{
                    
                    Section("Transaction"){
                        //Refactor into struct!!!!!!!!!
                        ListItem(leftItem: "Network:", rightItem: "XDC")
                        ListItem(leftItem: "Txn Hash::", rightItem: txnHash)
                        ListItem(leftItem: "To:", rightItem: sendto)
                        ListItem(leftItem: "From:", rightItem: currentWallet)
                        ListItem(leftItem: "Amount:", rightItem: sendAmount)
                        
                        HStack{
                            Text("Transaction Complete")
                            Spacer()
                            Image(systemName: "checkmark.seal.fill")
                                .scaledToFit()
                                .foregroundColor(.green)
                            Image(systemName: "info.circle")
                                .scaledToFit()
                                .foregroundColor(.blue)
                        }
                        sendCompleteScreen
                    }
                }
                .listStyle(.grouped)
                .font(.footnote)
            case false:
                HStack {
                    Button(action: {
                        isPresentingScanner = true
                    }, label: {
                        Image(systemName: "qrcode")
                            .padding()
                            .background(Color.blue)
                            .cornerRadius(10)
                    })
                    .sheet(isPresented: $isPresentingScanner){
                        CodeScannerView(codeTypes: [.qr]) { response in
                            if case let .success(result) = response {
                                scannedCode = result.string
                                isPresentingScanner = false
                                print("Scanned Code \(scannedCode)")
                                sendto = scannedCode
                            }
                        }
                    }
                    
                    TextField("Send To", text: $sendto)
                        .keyboardType(.numberPad)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.gray)
                        .cornerRadius(10)
                }
                .padding(.horizontal)
                
                TextField("amount", text: $sendAmount)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.gray)
                    .cornerRadius(10)
                    .padding(.horizontal)
                HStack{
                    Text("$\(((Double(sendAmount) ?? 0) * coinPriceViewModel.price) )")
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.gray)
                        .cornerRadius(10)
                        .padding(.horizontal)
                }
                
                Rectangle()
                    .fill(isPassed ? Color.green:Color.blue)
                    .frame(maxWidth: isComplete ?  .infinity:0)
                    .frame(height: 10)
                    .frame(maxWidth: .infinity,alignment: .leading)
                    .background(Color.gray)
                    .cornerRadius(50)
                    .padding(.horizontal)
                
                Spacer()
            
                HStack {
                    Button(action: {
                        selectWalletView = 0
                    }, label: {
                        Image(systemName: "arrow.counterclockwise")
                            .padding(20)
                            .background(Color.blue)
                            .cornerRadius(50)
                           .foregroundColor(.white)
                    })

                    
                    Button(action: {

                    }, label: {
                        Image(systemName: "paperplane.fill")
                             .padding(20)
                             .background(Color.green)
                             .cornerRadius(50)
                        
                            .foregroundColor(.white)
                            .onLongPressGesture(
                                minimumDuration: 1,
                                maximumDistance: 50) { (isPressing) in
                                // start of press to min duration
                                    if isPressing {
                                        withAnimation(.easeInOut(duration: 1.0)){
                                            isComplete = true
                                        }
                                    }else {
                                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1){
                                            if !isPassed {
                                                withAnimation(.easeInOut){
                                                    isComplete = false
                                                }
                                            }
                                        }
                                    }
                                } perform: {
                                    Task{
                                        txnHash = await  web3.Send(from: currentWallet, value: inverseFormatAndConvert(double: Double(sendAmount) ?? 0) , to: sendto)
                                    }
                                    // at min duration
                                    withAnimation(.easeInOut){
                                        isPassed = true
                                        SendComplete = true
                                    }
                                }
                    })
                }
                .padding(.bottom)
                
            }
        }
    }
    
    func showAddresses() async{
        do {
            let web3 = web3.RPC(RPC: web3.rpc)
            let accounts = try await web3?.eth.ownedAccounts()
            for account in accounts! {
                print(account.address)
            }
        } catch {
            print("Error getting accounts: \(error)")
        }
    }
    
    //MARK: sendCompleteScreen
    var sendCompleteScreen:some View{
        HStack{
            Spacer()
            Button(action: {
                backToWallet()
            }, label: {
                Image(systemName: "arrow.counterclockwise")
                    .padding()
                    .background(Color.green)
                    .cornerRadius(50)
                   .foregroundColor(.white)
            })
        }
        .padding(.horizontal)
    }
    
    //MARK: Functions
    func getQRCodeDate(text: String) -> Data? {
        guard let filter = CIFilter(name: "CIQRCodeGenerator") else { return nil }
        let data = text.data(using: .ascii, allowLossyConversion: false)
        filter.setValue(data, forKey: "inputMessage")
        guard let ciimage = filter.outputImage else { return nil }
        let transform = CGAffineTransform(scaleX: 10, y: 10)
        let scaledCIImage = ciimage.transformed(by: transform)
        let uiimage = UIImage(ciImage: scaledCIImage)
        return uiimage.pngData()!
    }
    
    func backToWallet(){
        selectWalletView = 0
        SendComplete = false
        isComplete = false
        isPassed = false
    }
}

//MARK: sendCrypto - ListItem
struct ListItem: View{
    var leftItem:String
    var rightItem:String
    
    var body: some View{
        VStack{
            HStack{
                Text(leftItem)
                    .bold()
                Spacer()
                Text(rightItem)
            }

        }
    }
}

struct ContractRow: View {
    let contract: String
    @State private var contractName: String = "Loading..."
    @State private var contractAmount: String = "Loading..."
    @StateObject var web3 = Web3wallet()
    var wallets = Wallets(networkSymbol: "XDC")
    var body: some View {
        HStack {
            Circle()
                .frame(width: 30)
            Text(contractName)
            Text(contractAmount)
            Spacer()
        }
        .onAppear {
            Task {
                let name = try await contractName(contract: contract)
                let amount = try await contractTokenAmount(contract: contract)
                contractName = name
                contractAmount = amount
            }
        }
    }
    
    func contractName(contract: String) async -> String {
        var result = "Text"
        result = await web3.nameXRC20(contractAddress: contract, address: wallets.currentWallet)
        return result
    }
    func contractTokenAmount(contract: String) async -> String {
        var result = "Text"
        result = await web3.balanceXRC20(contractAddress: contract, address: wallets.currentWallet)
        return result
    }
}
