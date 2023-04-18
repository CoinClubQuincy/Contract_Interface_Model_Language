//
//  Designer.swift
//  ContractInterface
//
//  Created by Quincy Jones on 12/16/22.
//

import SwiftUI
import Foundation
import Combine
import web3swift
import BigInt
//Hold all code compiling the CIML UI data
//rename this!!! -> this is the main class that handels the CIML Models
//MARK: ContractModel class
class ContractModel: ObservableObject{ //Build Settings
    @Published var showGrid:Bool = false
    @Published var testnet:Bool = false // may not need
    @Published var DevEnv:Bool = false
    //CIML Cache all data from DAppletUI is stored here
    //State vars??
    @Published var TextList:[CIMLText] = []
    @Published var TextFieldList:[CIMLTextField] = []
    @Published var ButtonList:[CIMLButton] = []
    @Published var SysImageList:[CIMLSYSImage] = []
    @Published var VariableList:[Variable_Model] = []
    @Published var FuntionList:[Function_Model] = []
    
    @Published var ViewList:[Views] = []
    
    //All CIML variables
    @Published var cimlVersion:String = ""
    @Published var appVersion:String = ""
    @Published var contractLanguage:String = ""
    @Published var name:String = ""
    @Published var symbol:String = ""
    @Published var logo:String = ""
    @Published var thumbnail:String = ""
    @Published var websitelink:String = ""
    @Published var cimlURL:String = ""
    @Published var description:String = ""
    @Published var networks:Any = []
    @Published var contractMainnet:String = ""
    @Published var screenShots: [String] = []
    @Published var abi:String = ""
    @Published var byteCode:String = ""
    @Published var variables: [Object] = []
    @Published var functions: [Function_Model] = []
    @Published var objects: [Object] = []
    @Published var views: [Views] = []
    @Published var metadata: [String] = []
    //object attributes
    @Published var textField: String = ""
    //Download data from internet
    @Published var ciml: [CIML] = []
    let totalViewCount:Int = 50
    @Published var dappletPage:Int = 0
    
    @Published var commit: Int = 0
    
    var web3Wallet = Web3wallet()
    
    var cancellables = Set<AnyCancellable>()
    init(){
        dappletPage = 0
        //getCIML(url: "https://test-youtube-engine-xxxx.s3.amazonaws.com/CIML/Example-3.json")
    }
    func save(){
        print("currently saving data to hardware")
        let manager = CoreDataManager.shared
        let CIML = ContractDoc(context: manager.persistantContainer.viewContext)
        //Save CIML Doc
        CIML.abi = abi
        CIML.appVersion = appVersion
        CIML.byteCode = byteCode
        CIML.cimlDescription = description
        CIML.cimlURL = cimlURL
        CIML.cimlVersion = cimlVersion
        CIML.contractLanguage = contractLanguage
        CIML.contractMainnet = contractMainnet
        //CIML.functions = functions
        //CIML.logo = logo
        CIML.name = name
        //CIML.networks = networks
        //CIML.objects = objects
        //CIML.screenShots = screenShots
        CIML.symbol = symbol
        //CIML.thumbnail = thumbnail
        //CIML.variables = variables
        //CIML.views =
        //CIML.metadata = metadata
        CIML.websiteLink = websitelink
        
        manager.save()
    }
    
    
    //MARK: get ciml func
    func getCIML(url:String) -> [CIML]{
        print("buton clicked")
        clearCompiler()
        guard let url = URL(string: url)else { return [] }

        URLSession.shared.dataTaskPublisher(for: url)
            .subscribe(on: DispatchQueue.global(qos: .background))
            .receive(on: DispatchQueue.main)
            .tryMap{ (data,response) -> JSONDecoder.Input in

                guard let response = response as? HTTPURLResponse,response.statusCode >= 200 && response.statusCode < 300 else {
                    throw URLError(.badServerResponse)
                }
                return data
            }
            .decode(type: [CIML].self, decoder: JSONDecoder())
            .sink { completion in
                if case .failure(let error) = completion {
                    print(error.localizedDescription)
                }
            } receiveValue: { [weak self] returnedCIML in
                print("Completion: \(returnedCIML)")
                self?.ciml = returnedCIML
                self?.parseCIML(ciml: self?.ciml ?? [])
            }
            .store(in: &cancellables)
        
        return self.ciml
    }
    //MARK: Parse Function
    func parseCIML(ciml:[CIML]){
        //Parse CIML Objects
        print("-------------------------------------- CIML DOC --------------------------------------")
        for typ in ciml{
            cimlVersion = typ.cimlVersion
            appVersion = typ.appVersion
            contractLanguage = typ.contractLanguage
            name = typ.name
            symbol = typ.symbol
            logo = typ.logo
            thumbnail = typ.thumbnail
            websitelink = typ.websitelink
            cimlURL = typ.cimlURL
            description = typ.description
            networks = typ.networks
            contractMainnet = typ.contractMainnet
            screenShots = typ.screenShots
            abi = typ.abi
            byteCode = typ.byteCode
//            variables: [Object] = []
//            functions: [String] = []
//            objects: [Object] = []
//            views: [Views] = []
            metadata = typ.metadata
//            //object attributes
            //MARK: Parse Functions
            for fun in typ.functions{
                FuntionList.append(Function_Model(funcName: fun.funcName, objectName: fun.objectName, type: fun.type, inputValue: fun.inputValue, outputValue: fun.outputValue))
            }
            print("funtions are placed")
            
            
            //MARK: Parse Views
            for view in typ.views{
                if (view.view == dappletPage && view.view <= totalViewCount){
                    ViewList.append(Views(view: view.view ,
                                          object: view.object ,
                                          location: view.location))
                } else {
                    print("Error incorrect view object: \(String(describing: view.object))")
                }
            }
            
            
            //MARK: Parse Vars
            for vars in typ.variables{
                    VariableList.append(Variable_Model(Name: vars.name ?? "varName Error",
                                                       Type: vars.type ?? "varType Error",
                                                       Value: vars.value ?? "varValue Error"))
            }
            //test
            for obj in typ.objects {
                //initaillize any atributes that have unique data types
                if(obj.alignment == "center" || obj.alignment == "leading" || obj.alignment == "trailing" ){
                    objectAttributes_alignment(objectAttribute: obj.alignment ?? "center")
                } else if (obj.fontWeight == "regular" || obj.fontWeight == "heavy" || obj.fontWeight == "light" ){
                    objectAttributes_fontWeight(objectAttribute: obj.fontWeight ?? "regular")
                } else if (obj.backgroundColor == "black" /*all major colors */){
                    objectAttributes_backgroundColor(objectAttribute: obj.backgroundColor ?? "clear")
                } else if (obj.font == "headline" /* All Font types */){
                    objectAttributes_Font(objectAttribute: obj.font ?? "headline")
                    //change colors
                } else if (obj.font == "Colors"){
                    objectAttributes_Color(objectAttribute:"Colors")
                }
                //MARK: Parse Text
                if (obj.type == "text"){
                    //add default data optionals
                    print(obj.type)
                    print("---------------------------------------- append textLst")
                    print(obj.frame?[0])
                    TextList.append(CIMLText(text: varAllocation(objectName: obj.name ?? "Error", objectValue: obj.value ?? "Error", objectType: "text"),
                                             foreGroundColor: Color(.black),
                                             font: .headline, // add func
                                             frame: [CGFloat(obj.frame?[0] ?? 100),CGFloat(obj.frame?[1] ?? 50)],
                                             alignment: .center, // add func
                                             backgroundColor: Color(.clear),
                                             cornerRadius: obj.cornerRadius ?? 0,
                                             bold: obj.bold ?? false,
                                             fontWeight: .regular, // add func
                                             shadow: obj.shadow ?? 0,
                                             padding: CGFloat(obj.padding ?? 0),
                                             location: Placement(object: obj.name ?? "nil") ))
                    
                    print(obj.name)
                    print("check placement")
                    print(TextList.count)
                    //MARK: Parse TextField
                }else if (obj.type == "textField"){
                    TextFieldList.append(CIMLTextField(text: varAllocation(objectName: obj.name ?? "Error", objectValue: obj.value ?? "Error", objectType: "text"),
                                                       textField: obj.textField ?? "",
                                                       foreGroundColor: .gray,
                                                       frame: [CGFloat(obj.frame?[0] ?? 100),CGFloat(obj.frame?[1] ?? 50)],
                                                       alignment: .all,
                                                       backgroundColor: .white,
                                                       cornerRadius: obj.cornerRadius ?? 0,
                                                       shadow: 0,
                                                       padding: 0,
                                                       location: Placement(object: obj.name ?? "nil") ))
 
                    
                    print("text field count")
                    print(obj.type)
                    print(TextFieldList.count)
                    //MARK: Parse Button
                }else if (obj.type == "button"){
                    ButtonList.append(CIMLButton(text: varAllocation(objectName: obj.name ?? "Error", objectValue: obj.value ?? "Error", objectType: "text"),
                                                 isIcon: false,
                                                 foreGroundColor: .black,
                                                 font: .headline,
                                                 frame: [CGFloat(obj.frame?[0] ?? 100),CGFloat(obj.frame?[1] ?? 50)],
                                                 alignment: .center,
                                                 backgroundColor: .blue,
                                                 cornerRadius: obj.cornerRadius ?? 0,
                                                 bold: obj.bold  ?? false,
                                                 fontWeight: .regular, // add func
                                                 shadow: obj.shadow ?? 0,
                                                 padding: CGFloat(obj.padding ?? 0),
                                                 location: Placement(object: obj.name ?? "nil") ,
                                                 type: buttonAlocation(objectName: obj.name ?? "error", typeValue: false), value: buttonAlocation(objectName: obj.name ?? "error", typeValue: true)))
                    print(obj.type)
                    print(ButtonList.count)
                } else if (obj.type == "iconButton"){
                                    ButtonList.append(CIMLButton(text: obj.value ?? "exclamationmark.triangle.fill",
                                                 isIcon: true,
                                                 foreGroundColor: Color(obj.foreGroundColor ?? ".black"),
                                                 font: .headline,
                                                 frame: [CGFloat(obj.frame?[0] ?? 100),CGFloat(obj.frame?[1] ?? 50)],
                                                 alignment: .center,
                                                 backgroundColor: .black,
                                                 cornerRadius: obj.cornerRadius ?? 0,
                                                 bold: obj.bold  ?? false,
                                                 fontWeight: .regular,
                                                 shadow: obj.shadow ?? 0,
                                                 padding: CGFloat(obj.padding ?? 0),
                                                                 location: Placement(object: obj.name ?? "nil") ,
                                                 type: buttonAlocation(objectName: obj.name ?? "error", typeValue: false), value: buttonAlocation(objectName: obj.name ?? "error", typeValue: true)))
                    print(obj.type)
                    print(ButtonList.count)
                    //MARK: Parse SysImage
                }else if (obj.type == "sysimage"){
                    SysImageList.append(CIMLSYSImage(name: obj.value ?? "exclamationmark.triangle.fill",
                                                     frame: [CGFloat(obj.frame?[0] ?? 100),CGFloat(obj.frame?[1] ?? 50)],
                                                     padding: 0,
                                                     color: .black,
                                                     location: Placement(object: obj.name ?? "nil") ))
                    print(obj.type)
                    print(SysImageList.count)
                } else {
                    print("Error incorrect object type: \(String(describing: obj.type))")
                }
            }
            

            print("total TextList: ",TextList.count)
            print("total TextField: ",TextFieldList.count)
            print("total SysImageList: ",SysImageList.count)
            print("total ButtonList: ",ButtonList.count)
            print("total ViewList: ",ViewList.count)
            print("total VarList: ",VariableList.count)
            print("total funcList: ",FuntionList.count)

            print("dapplet page")
            print(dappletPage)
        }
    }
    
    private func asyncReadDApp(abiString: String, ContractAddress: String, Function: String, param: [String], from: String) async throws -> String {
      let response = try await web3Wallet.ReadDApp(abiString: abiString, ContractAddress: ContractAddress, Function: Function, param: param, from: from)
      return response
    }
    private func asyncWriteDApp(abiString: String, ContractAddress: String, Function: String, param: [String], from: String) async throws -> String {
      let response = try await web3Wallet.WriteDApp(abiString: abiString, ContractAddress: ContractAddress, Function: Function, param: param, from: from)
      return response
    }
    
    func buttonEventListerner(object:String,value:String) async{
        
    }
    func listener(type:String) async {
        
    }
    
    //runs continuously and updates all read data from contract
    func eventListener() async {
        var varCount = 0
        var ReadVar = "Func Error"
        let abi: String = """
    [
        {
            "inputs": [],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "inputs": [],
            "name": "Bool",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "Numb",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "String",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "read",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bool",
                    "name": "_bool",
                    "type": "bool"
                }
            ],
            "name": "writeBool",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_int",
                    "type": "uint256"
                }
            ],
            "name": "writeINT",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_string",
                    "type": "string"
                }
            ],
            "name": "writeString",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]

    """
        for Var in VariableList{
            for Read in FuntionList {
                if(Var.varName == Read.objectName && Read.type == "Read"){
                    do {
                        ReadVar = try await asyncReadDApp(abiString: abi, ContractAddress: contractMainnet, Function: "read", param: [], from: "0x981f101912bc24E882755A6DD8015135D0cc4D4D")
                        print("Executed Contract Func")
                    } catch {
                      // handle the error
                        print("func execution error")
                    }
                    print("web3 complete")

                    print("------ TextList ------")
                    for txt in TextList {
                        var Textcount = 0
                        if(txt.text == VariableList[varCount].value){
                            TextList[Textcount].text = ReadVar
                        }
                        Textcount += 1
                    }
                    VariableList[varCount].value = ReadVar
                    print("------ VAR successfully swapped ------")
                }
            }
            varCount += 1
        }
    }
    
    func varAllocation(objectName:String,objectValue:String,objectType:String)->String{
        var tmpVar:String = ""
        for vars in VariableList{
            print("-------------------- variable list --------------------")
            print(vars.varName)
            print(vars.type)
            print(objectName)
            if(vars.type == objectType){
                if (String(vars.varName) == String(objectName)){
                    print("------------------Objects --------------------")
                    tmpVar = vars.value
                    print(vars.varName)
                    print(vars.value)
                    return tmpVar
                }
            }
        }
        return(tmpVar == "" ? objectValue:tmpVar)
    }
    
    func varUpdater(varname: String,varvalue:String,type:String) {
        print("var updater executed")
        var _: String = ""
        print(varvalue)
        print(varname)
        print(type)
        
        //first list
        for vars in VariableList {
            var varCount = 0
            print("reading Var list for var-x")
            print("var \(vars.varName) nvar \(varname.dropFirst(4))")

            //second list
            if vars.varName == varname.dropFirst(4) {
                print("check var \(vars.varName )")
                
                for objectList in TextList {
                    var Textcount = 0
                    if(vars.varName == varname.dropFirst(4) ){
                        TextList[Textcount].text = varvalue
                        VariableList[varCount].value = varvalue
                        
                        print("compare vars \(vars.varName) - \(varname.dropFirst(4))")
                        print(varvalue)
                    }
                    Textcount += 1
                }
                print("this is the var: \(vars.value) old object: \(varname)")
            } //second list
            varCount += 1
        } //first list
    }
    
    //true: ButtonType, False Vartype
    func buttonAlocation(objectName:String,typeValue:Bool)-> [String]{
        var buttonList:[String] = []
        var valueList:[String] = []
       
        print("Allocate Button Vars")
        for vars in VariableList{
            print(send)
            if(objectName == vars.varName.dropFirst()){
                if(typeValue){ // value alocation true
                    print("Vars Type: \(vars.type)")
                    switch vars.type.prefix(4){
                    case "segu": //segue
                        buttonList.append(varAllocation(objectName: vars.varName, objectValue: vars.value, objectType: vars.type))
                    case "togg": //toggle
                        buttonList.append(varAllocation(objectName: vars.varName, objectValue: vars.value, objectType: vars.type) == "true" ? "false":"true")
                    case "Send": "Send"
                        print("Send Button: \(vars.varName),\(vars.value),\(vars.type)")
                        buttonList.append(varAllocation(objectName: vars.varName, objectValue: vars.value, objectType: vars.type))
                    case "var-":
                        buttonList.append(varAllocation(objectName: vars.varName, objectValue: vars.value, objectType: vars.type))
                    default:
                        return []
                    }
                } else {
                    valueList.append(vars.type)
                }
            }
        }
        if(typeValue){
            print(buttonList)
            return buttonList
        } else {
            print(valueList)
            return valueList
        }
    }
    
    func Placement(object:String) -> (Int){
        for objectLocation in ViewList{
            print(objectLocation.object)
            if(objectLocation.object == object){
                print(objectLocation.location)
                return objectLocation.location
            }
        }
        return (0)
    }
    
    
    //MARK: Object attributes functions
    func objectAttributes_alignment(objectAttribute:String){
        if(objectAttribute == ""){
            
        } else if (objectAttribute == ""){
            
        }
    }
    func objectAttributes_fontWeight(objectAttribute:String){
        if(objectAttribute == ""){
            
        } else if (objectAttribute == ""){
            
        }
    }
    func objectAttributes_backgroundColor(objectAttribute:String){
        if(objectAttribute == ""){
            
        } else if (objectAttribute == ""){
            
        }
    }
    func objectAttributes_Font(objectAttribute:String){
        if(objectAttribute == ""){
            
        } else if (objectAttribute == ""){
            
        }
    }
    func objectAttributes_Color(objectAttribute:String){
        if(objectAttribute == ""){
            
        } else if (objectAttribute == ""){
            
        }
    }
    
    //MARK: Manage CIML Document
    func openCIML(address:String){
        print("you opend: \(address) DApplet")
    }
    func deleteCIML(address:String){
        print("you deleted: \(address) DApplet")
    }
    //MARK: Manage CIML Document
    func changePageSegue(page:Int){
        dappletPage = page
    }
    func toggleButton(status:Bool){}
    //add Objects to MoodelViews
    func addBuildText(token:CIMLText){
        if(DevEnv){ TextList.append(token)} else { return }
    }
    func addBuildTextField(token:CIMLTextField){
        if(DevEnv){ TextFieldList.append(token) } else { return }
    }
    func addBuildSYSImage(token:CIMLSYSImage){
        if(DevEnv){ SysImageList.append(token) } else { return }
    }
    func addBuildButton(token:CIMLButton){
        if(DevEnv){ ButtonList.append(token) } else { return }
    }
    
    //true clears final view
    //false clears entire Dapplet
    func clearCompiler(){
            TextList.removeAll()
            TextFieldList.removeAll()
            SysImageList.removeAll()
            ButtonList.removeAll()
            VariableList.removeAll()
            ViewList.removeAll()
            FuntionList.removeAll()
    }
        
    //Button Actions
    func segueAction(page:Int){}
    
    func Web3Action(){}
    
    private func editCIML(address:String){
        print("you edited: \(address) DApplet")
    }
}

//MARK: Final View // View Comiler
struct DAppletView: View {
    //@State var gridStatus:Bool = true
    @State var gridPlotView:Color = .black
    @State var gridNumberView:Color = .white
    var deviceSize:Double = 1.0
    @StateObject var contractInterface:ContractModel
    
    let data = Array(1...146).map { "\($0)" }
    let layout = [
        GridItem(.adaptive(minimum: 30,maximum: 30))
    ]
    
    var body: some View {
        ZStack {
            NavigationView{
                GeometryReader{geo in
                    RoundedRectangle(cornerRadius: 15)
                        .frame(width: geo.size.width * 1.0,height: geo.size.height * 1.0)
                        .foregroundColor(Color(hex: contractInterface.varAllocation(objectName: "background", objectValue: "#00FF00", objectType: String(contractInterface.dappletPage))))
                        //.background(Color.black)
                        .onAppear{
                            //Color or Gradient
                            print(contractInterface.varAllocation(objectName: "background", objectValue: "#00FF00", objectType: String(contractInterface.dappletPage)))
                        }
                    
                    LazyVGrid(columns: layout){
                        ForEach(data, id: \.self){item in
                            ZStack {
                                Circle()
                                    .foregroundColor(contractInterface.showGrid ? .black : .clear)
                                    .overlay{
                                        Text("\(item)")
                                            .foregroundColor(contractInterface.showGrid ? .white : .clear)
                                    }
                            }
                            .foregroundColor(gridPlotView)
                            .frame(height: geo.size.width * 0.1)
                            .overlay{
                                Overlay(contractInterface: contractInterface, cordinates: Int(item)!)
                                
                            }
                            .task{
                                //await contractInterface.eventListener()
                            }
                        }
                    }
                }
            }
            .navigationBarItems(
                leading:
                    Image(systemName: "folder.badge.plus")
                    .foregroundColor(.blue)
                ,trailing:
                    NavigationLink(
                        destination: Text("Favorites")
                            .navigationTitle("Favorites")
                        ,label: {
                            Image(systemName: "plus")
                                .foregroundColor(.blue)
                        })
            )
        }
        .cornerRadius(15)
        .shadow(radius: 20)
        .background(Color.clear)
        .frame(width: 360*deviceSize, height: 640*deviceSize)
    }
}
//MARK: OverLay View
struct Overlay: View{// Compiler
    //@StateObject var vmCIML = ManageCIMLDocument()
    var test:Double = 1.0
    @StateObject var contractInterface:ContractModel

    var cordinates:Int
    //MARK: DApplet Projector
    var body: some View{
        ZStack {
            ForEach(contractInterface.TextList) { list in
                if cordinates == list.location {
                    TEXT(text: list.text, foreGroundColor: list.foreGroundColor, font: list.font,
                         frame: list.frame, alignment: list.alignment, backgroundColor: list.backgroundColor,
                         cornerRadius: list.cornerRadius, bold: list.bold, fontWeight: list.fontWeight,
                         shadow: list.shadow, padding: list.padding, location: list.location)
                }
            }
            
            ForEach(contractInterface.TextFieldList){ list in
                if cordinates == list.location {
                    TEXT_FIELD(text: list.text, textField: list.textField, foreGroundColor: list.foreGroundColor, frame: list.frame,
                            alignment: list.alignment, backgroundColor: list.backgroundColor,
                               cornerRadius: list.cornerRadius, shadow: list.shadow,padding: list.padding ,location: list.location, overlay: self)

                }
            }
            ForEach(contractInterface.SysImageList){ list in
                if cordinates == list.location {
                    SYSIMAGE(sysname: list.name, frame: list.frame, padding: list.padding, color: .black, location: list.location)
                }
            }
            ForEach(contractInterface.ButtonList){ list in
                if cordinates == list.location {
                    BUTTONS(text: list.text, isIcon: list.isIcon, foreGroundColor: list.foreGroundColor, font: list.font,
                            frame: list.frame, alignment: list.alignment, backgroundColor: list.backgroundColor,
                            cornerRadius: list.cornerRadius, bold: list.bold, fontWeight: list.fontWeight,
                            shadow: list.shadow, padding: list.padding, location: list.location, contractInterface: contractInterface,overlay: self, type: list.type, value: list.value)
                }
            }
        }
    }

    func UpdateFromButton(name:String,value:String,type:String){
        contractInterface.varUpdater(varname: name, varvalue: value, type: type)
       
    }
}
//MARK: TEXT View
struct TEXT: View {
    let id: String = UUID().uuidString
    var text:String
    var foreGroundColor:Color
    var font:Font
    var frame:[CGFloat]
    var alignment:Alignment
    var backgroundColor:Color
    var cornerRadius:CGFloat
    var bold:Bool
    var fontWeight:Font.Weight
    var shadow:CGFloat
    var padding:CGFloat
    var location:Int

    var body: some View {
        Text(text)
            .foregroundColor(foreGroundColor)
            .font(font)
            .frame(width: frame[0], height: frame[1], alignment: alignment)
            .background(backgroundColor)
            .cornerRadius(cornerRadius)
            .bold(bold)
            .fontWeight(fontWeight)
            .shadow(radius: shadow)
            .padding(padding)
    }
}
//MARK: TEXTFIELD View
struct TEXT_FIELD:View{
    var text:String
    @State var textField:String
    var foreGroundColor:Color
    var frame:[CGFloat]
    var alignment:Edge.Set
    var backgroundColor:Color
    var cornerRadius:CGFloat
    var shadow:CGFloat
    var padding:CGFloat
    var location:Int
    var overlay: Overlay
    
    var body: some View {
        TextField(text, text: $textField)
            .padding(10)
            .frame(width: frame[0])
            .frame(height: frame[1])
            .foregroundColor(foreGroundColor)
            .background(backgroundColor)
            .cornerRadius(cornerRadius)
            .padding(alignment,padding)
            .shadow(radius: shadow)
            .onChange(of: textField) { newValue in
                print("New value: \(newValue)")
                overlay.UpdateFromButton(name: String("var-\(text)"), value: newValue, type: "textFeild")
        }
    }
}
//MARK: SYSIMAGE View
struct SYSIMAGE:View{
    var sysname:String
    var frame:[CGFloat]
    var padding:CGFloat
    var color:Color
    var location:Int
    
    var body: some View {
        Image(systemName: sysname)
            .resizable()
            .scaledToFit()
            .foregroundColor(color)
            .frame(width: frame[0])
            .padding(padding)
        }
}

//MARK: BUTTONS View
struct BUTTONS:View{
    var text:String
    var isIcon:Bool
    var foreGroundColor:Color
    var font:Font
    var frame:[CGFloat]
    var alignment:Alignment
    var backgroundColor:Color
    var cornerRadius:CGFloat
    var bold:Bool
    var fontWeight:Font.Weight
    var shadow:CGFloat
    var padding:CGFloat
    var location:Int
   //@State var finalButtonLabelList:[CIMLText]
    @StateObject var contractInterface:ContractModel
    @StateObject var web3 = Web3wallet()
    @StateObject var controller = ButtonController()
    var overlay: Overlay
    var type:[String]
    var value:[String]
    
    var body: some View {
        ZStack {
            Button(action: {
                print("press button")
                
                
            }, label: {
                if(isIcon){
                    Image(systemName: text)
                        .foregroundColor(foreGroundColor)
                        .frame(width: frame[0], height: frame[1], alignment: alignment)
                        .background(isIcon ? .clear : backgroundColor)
                        .shadow(radius: shadow)
                        .padding(padding)
                        .onLongPressGesture(minimumDuration: 0.1) {
                            
                        }
                } else{
                    Text(text)
                        .foregroundColor(foreGroundColor)
                        .font(font)
                        .frame(width: frame[0], height: frame[1], alignment: alignment)
                        .background(backgroundColor)
                        .cornerRadius(cornerRadius)
                        .bold(bold)
                        .fontWeight(fontWeight)
                        .shadow(radius: shadow)
                        .padding(padding)
                }
            })
            .simultaneousGesture(LongPressGesture().onEnded { _ in
                for i in 0..<type.count {
                    print("Type: \(type[i])")
                
                if(type[i] == "segue"){
                    print(value)
                    contractInterface.changePageSegue(page: Int(value[i]) ?? 0)
                    contractInterface.getCIML(url: contractInterface.cimlURL)
                    print("pressed Segue Button page status: \(contractInterface.dappletPage)")
                } else if (type[i] == "toggle"){
                    contractInterface.toggleButton(status: Bool(value[i]) ?? false)
                    print("pressed togle Button")
                } else if (type[i].prefix(4) == "Send"){
                    print(i)
                    print(value)
                    let value = Int(value[i]) ?? 0
                    let string = type[i]
                    let page = String(string[string.index(string.startIndex, offsetBy: 4)])
                    print("Page change: \(page)")

                    
                    contractInterface.changePageSegue(page: Int(page) ?? 0)
                    contractInterface.getCIML(url: contractInterface.cimlURL)
                    Task{
                        await web3.Send(from: "0x54Dd2A2508618e927643fD57d602Fe7cC9ed3b0A", value: BigUInt(value) , to: String(type[i].suffix(42)))
                    }
                    print("pressed Submit Button")
                } else if (type[i].prefix(3) == "var"){
                    // var-varNameToBeUpdated
                    print(String(type[i].dropFirst(4)))
                    print(type[i])
                    print(value[i])
                    overlay.UpdateFromButton(name: String(type[i]), value: value[i], type: "button")

                } else if(type[i].prefix(3) == "wri"){
                    // var-varNameToBeUpdated
                    print(String(type[i].dropFirst(4)))
                    print(type[i])
                    print(value[i])
                    
                    
                    overlay.UpdateFromButton(name: String(type[i]), value: value[i], type: "button")
                    
                }
            }

            })
            .simultaneousGesture(TapGesture().onEnded {

                print("type: \(controller.type) value: \(controller.value)")
            })
        }
    }
    
}

class ButtonController: ObservableObject{
    @Published var type:String = ""
    @Published var value:String = ""
    
    @Published var changeType:[String] = []
    @Published var changevalue:[String] = []
    init(){}
    
    func ubpdateButton(Type:String,Value:String){
        type = Type
        value = Value
    }
}

extension Color {
    init(hex string: String) {
        var string: String = string.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
        if string.hasPrefix("#") {
            _ = string.removeFirst()
        }

        // Double the last value if incomplete hex
        if !string.count.isMultiple(of: 2), let last = string.last {
            string.append(last)
        }

        // Fix invalid values
        if string.count > 8 {
            string = String(string.prefix(8))
        }

        // Scanner creation
        let scanner = Scanner(string: string)

        var color: UInt64 = 0
        scanner.scanHexInt64(&color)

        if string.count == 2 {
            let mask = 0xFF

            let g = Int(color) & mask

            let gray = Double(g) / 255.0

            self.init(.sRGB, red: gray, green: gray, blue: gray, opacity: 1)

        } else if string.count == 4 {
            let mask = 0x00FF

            let g = Int(color >> 8) & mask
            let a = Int(color) & mask

            let gray = Double(g) / 255.0
            let alpha = Double(a) / 255.0

            self.init(.sRGB, red: gray, green: gray, blue: gray, opacity: alpha)

        } else if string.count == 6 {
            let mask = 0x0000FF
            let r = Int(color >> 16) & mask
            let g = Int(color >> 8) & mask
            let b = Int(color) & mask

            let red = Double(r) / 255.0
            let green = Double(g) / 255.0
            let blue = Double(b) / 255.0

            self.init(.sRGB, red: red, green: green, blue: blue, opacity: 1)

        } else if string.count == 8 {
            let mask = 0x000000FF
            let r = Int(color >> 24) & mask
            let g = Int(color >> 16) & mask
            let b = Int(color >> 8) & mask
            let a = Int(color) & mask

            let red = Double(r) / 255.0
            let green = Double(g) / 255.0
            let blue = Double(b) / 255.0
            let alpha = Double(a) / 255.0

            self.init(.sRGB, red: red, green: green, blue: blue, opacity: alpha)

        } else {
            self.init(.sRGB, red: 1, green: 1, blue: 1, opacity: 1)
        }
    }
}


extension Data
{
    func toString() -> String?
    {
        return String(data: self, encoding: .utf8)
    }
}
