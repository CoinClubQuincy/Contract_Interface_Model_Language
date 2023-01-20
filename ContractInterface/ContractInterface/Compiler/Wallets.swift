//
//  Wallets.swift
//  ContractInterface
//
//  Created by Quincy Jones on 12/28/22.
//

import SwiftUI
import web3swift
import Core
import BigInt
import CryptoSwift
//import XDC3Swift
//https://cocoapods.org/pods/web3swift#projects-that-are-using-web3swift
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


class Web3wallet: ObservableObject {
    
    var clientUrl:String = ""

    init(){
        createWallet(seed: "1234")
        Task {
            print("check address")
            let balance = await getBalanceTotal(address: "0xC0869eed9fdfb45623571940933654cdaa8feF7a")
            print("balance: \(balance)")
        }
    }
    func createWallet(seed:String){
        let keystore = try! EthereumKeystoreV3(password: seed)
        let keydata = try! JSONEncoder().encode(keystore?.keystoreParams)
        let keystoreString = String(data: keydata, encoding: .utf8)

        print("Keystore: \(keystoreString!)")

        let address = keystore?.addresses![0]
        print("Address: \(address?.address)")
        
    }
    
    func RPC(RPC:String = "http://127.0.0.1:8545",ID:BigInt = 5777) -> Web3? {
        var provider = MyWeb3Provider(url: URL(string: "http://localhost:8545")!)

        //var provider = URL(string: "http://localhost:8545") as! Web3Provider
        let web3 = Web3(provider: provider)
        //print(self.web3Provider.url)
        return web3
    }
    
    //0xC0869eed9fdfb45623571940933654cdaa8feF7a
    func getBalanceTotal(address: String) async -> BigUInt{
        let web3 = RPC()
        guard let address = EthereumAddress(address) else { return 0 }
        guard let balance = try! await web3?.eth.getBalance(for: address) else { return 0 }
        print("getBalance: \(balance)")
        return balance
    }
    
    func Send(from:EthereumAddress,value:BigUInt,to:String) async{
        let web3 = Web3(provider: URL(string:  "http://127.0.0.1:8545")! as! Web3Provider)

        var transaction: CodableTransaction = .emptyTransaction
        
        let fromAddress = "0x0000000000000000000000000000000000000000"
        let toAddress = "0x0000000000000000000000000000000000000001"

        //let options = TransactionOptions.defaultOptions
        transaction.from = EthereumAddress(fromAddress)
        transaction.to = EthereumAddress(toAddress) ?? transaction.from!
        transaction.value = value
        transaction.gasLimit = BigUInt(78423)
        transaction.gasPrice = BigUInt(2000)

        try! await web3.eth.send(transaction)
    }
    
    func executeDApp() async{
//        let yourContractABI: String = ""
//        let toEthereumAddress: EthereumAddress = EthereumAddress("0xC0869eed9fdfb45623571940933654cdaa8feF7a") ?? <#default value#>!
//        let abiVersion: Int = 0
//
//        let contract = await Web3.InfuraMainnetWeb3().contract(yourContractABI, at: toEthereumAddress, abiVersion: abiVersion)
//
//        let method: String = ""
//        let parameters: [AnyObject] = []
//        let extraData: Data = ""
//        let transactionOptions: TransactionOptions = <OPTIONS>

//        let transactionRead = contract.read(method, parameters: parameters, extraData: extraData, transactionOptions: transactionOptions)
//        let transactionWrite = contract.write(method, parameters: parameters, extraData: extraData, transactionOptions: transactionOptions)
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

//MARK: Wallets
struct Wallets: View {
    @State var isComplete:Bool = false
    @State var isPassed:Bool = false
    @State var sendto:String = ""
    @State var sendAmount:String = ""
    @State var SendComplete:Bool = false
    @State var fiatConvert:Int = 0
    @State var developerMode:Bool = false
    @State var faceID:Bool = false
    @State var settingsPage:Bool = false
    
    @State private var qrdata = "xdce64996f74579ed41674a26216f8ecf980494dc38" //this is the QRC data
    @State var selectWalletView:Int = 0
    
    
    @StateObject var web3 = Web3wallet()
    
    enum wallet: String, CaseIterable, Identifiable {
        case wallet1, wallet2, wallet3, wallet4
        var id: Self { self }
    }

    @State private var selectedWallet: wallet = .wallet1
    
    //@StateObject var web3 = Web3wallet()
    
    enum network: String, CaseIterable, Identifiable {
        case xdc, eth
        var id: Self { self }
    }

    @State private var selectedNetwork: network = .xdc
  
    //MARK: body
    var body: some View {
        ZStack{
            userWallet
            }
    }
    
    //MARK: userWallet
    var userWallet: some View{
        VStack {
            Circle()
                .scaledToFit()
                .frame(width: 120)
            
            Text("XDC")
            Text("2434.462")
                .font(.largeTitle)
                .bold()

            Text("$234.53")
                .font(.caption)
                .bold()
            
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
                        selectWalletView = 3
                    }, label: {
                       Image(systemName: "plus")
                            .padding(20)
                            .background(Color.blue)
                            .cornerRadius(50)
                    })
                
                Spacer()
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
            
            
            Text(qrdata)
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
            case 3:
                Text("Create wallet")
            default:
                list
            }
    }
}
    //MARK: list
    var list:some View{
        List{
            if(settingsPage){
                Section("Network"){
                    Picker("Network", selection: $selectedWallet) {
                        Text("XDC").tag(network.xdc)
                        Text("ETH").tag(network.eth)
                    }
                    HStack{
                        Text("RPC:")
                        Spacer()
                        Text("https://XinFin.Network/")
                    }
                    Toggle("Face ID", isOn: $faceID)
                    Toggle("Developer Mode", isOn: $developerMode)
                    if(developerMode){
                        
                    }
                }
            } else {
                Section("Wallet"){
                    HStack{
                        Picker("Wallet", selection: $selectedWallet) {
                            Text("Wallet A").tag(wallet.wallet1)
                            Text("Wallet B").tag(wallet.wallet2)
                            Text("Wallet C").tag(wallet.wallet3)
                        }
                    }
                    NavigationLink(destination: transactionHistory) {
                        Text("Transaction History")
                    }
                }
                Section("Tokens"){
                    HStack{
                        HStack {
                            Circle()
                                .frame(width: 30)
                            Text("PLI")
                            Text("150,340")
                            Spacer()
                            Text("$243.43")
                        }
                    }
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
                
                Image(uiImage: UIImage(data: getQRCodeDate(text: qrdata)!)!)
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
                        ListItem(leftItem: "Txn Hash::", rightItem: "0x1a964fb5309e9e14599948480c122b5912349e602a835120d870de69b3be15fe")
                        ListItem(leftItem: "To:", rightItem: "xdc973c93dcb8c5eaad405e52a3e9fd100ad2f7d933")
                        ListItem(leftItem: "From:", rightItem: "xdce64996f74579ed41674a26216f8ecf980494dc38")
                        
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
                    Button(action: {}, label: {
                        Image(systemName: "qrcode")
                            .padding()
                            .background(Color.blue)
                            .cornerRadius(10)
                    })
                    
                    TextField("Send To", text: $sendAmount)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.gray)
                        .cornerRadius(10)
                }
                .padding(.horizontal)
                
                TextField("amount", text: $sendto)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.gray)
                    .cornerRadius(10)
                    .padding(.horizontal)
                HStack{
                    Text("$\(fiatConvert)")
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

                    
                    Button(action: {}, label: {
                        Image(systemName: "paperplane.fill")
                             .padding(20)
                             .background(Color.blue)
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

struct Wallets_Previews: PreviewProvider {
    static var previews: some View {
        Wallets()
    }
}
