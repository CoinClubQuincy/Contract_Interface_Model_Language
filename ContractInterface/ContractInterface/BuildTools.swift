//
//  BuildTools.swift
//  ContractInterface
//
//  Created by Quincy Jones on 12/19/22.
//

import SwiftUI


//MARK: BuildView
struct BuildView: View {
    
    @State var showObjects:Bool = false
    @State var showSettings:Bool = false
    @Binding var backgroundColor:LinearGradient
    @StateObject var grid:Grid
    
    
    var body: some View {
        ZStack{
            backgroundColor
                .ignoresSafeArea(.all)
        VStack{
            CIMLFinalView(grid: grid)

            BuildTools(showObjects: $showObjects,showSettings: $showSettings, grid: grid)
                .padding(.bottom)
                .padding(.top)
            }
        }
    }
}

//MARK: BuildTools
struct BuildTools: View {
    @Binding var showObjects:Bool
    @Binding var showSettings:Bool
    @StateObject var grid:Grid
    @State private var showObjectView = 0
    @State var objectTypeSelected=0
    
    @State var dataTypeVaraiable:String = ""
    
    
    @State var objectForeGroundColor: Color = .black
    @State var objectFont: Font = .headline
    @State var objectSize:[CGFloat] = [100,50]
    @State var objectAlignment:Alignment = .center
    
    @State var objectBackgroundColor:Color = .blue
    @State var objectCornerRadius:CGFloat = 0
    @State var objectBold:Bool = false
    @State var objectFontWeightt:Font.Weight = .regular
    @State var objectShadow:CGFloat = 0
    @State var objectPadding:CGFloat = 20
    @State var objectTextFieldAlignment:Edge.Set = .all
    
    @State private var bgColor = Color.red
    @State var sliderValue:Double = 3
    
    var body: some View {
        
//        if(showObjects){
//            Spacer().animation(.easeIn)
//        }
        HStack{
            Button(action: {
                
            }, label: {
                Image(systemName: "trash")
                    .resizable()
                    .scaledToFit()
            })
            

            
            Spacer()
            
            Button(action: {
                
            }, label: {
                Image(systemName: "folder.fill.badge.plus")
                    .resizable()
                    .scaledToFit()
            })
            
            Spacer()
            
            Button(action: {
                
            }, label: {
                Image(systemName: "plus")
                    .resizable()
                    .scaledToFit()
            })
            
            
            Spacer()
            
            Button(action: {
                showSettings.toggle()
            }, label: {
                Image(systemName: "gear")
                    .resizable()
                    .scaledToFit()
            })
            .sheet(isPresented: $showSettings, content: {
                SettingsPallet
                    .presentationDetents([.fraction(0.90)])
            })


            Spacer()
            
            Button(action: {
                showObjects.toggle()
            }, label: {
                Image(systemName: "doc.fill.badge.plus")
                    .resizable()
                    .scaledToFit()
            })
            .sheet(isPresented: $showObjects, content: {
                ObjectsPallet
                    .presentationDetents([.fraction(1.00)])
            })
            
            
        }
        .frame(maxWidth: .infinity)
        .frame(height: 30)
        .padding(.horizontal,30)
    }
    
    //MARK: ObjectsPallet
    var ObjectsPallet: some View{
        VStack{
            switch showObjectView {
            case 0:
                Text("Objects")
                    .bold()
                    .font(.title)
                    .padding(.top)
                Spacer()
                ObjectsSection
            case 1:
                Text("Functions")
                    .bold()
                    .font(.title)
                    .padding(.top)
                Spacer()
                FunctionsSection
                    .padding(.bottom)
                
            case 2:
                Text("Variables")
                    .bold()
                    .font(.title)
                    .padding(.top)
                Spacer()
                VariablesSection
                    .padding(.bottom)
            default:
                ObjectsSection
            }
            
            
            //MARK: Object Types
            HStack(alignment: .center){
                
                Button(action: {
                    showObjectView = 2
                }, label: {
                    Text("Variables")
                        .bold()
                        .foregroundColor(.black)
                        .frame(width: 100,height: 30)
                        .background(Color.blue)
                        .cornerRadius(10)
                })
                Button(action: {
                    showObjectView = 1
                }, label: {
                    Text("Functions")
                        .bold()
                        .foregroundColor(.black)
                        .frame(width: 100,height: 30)
                        .background(Color.blue)
                        .cornerRadius(10)
                })
                Button(action: {
                    showObjectView = 0
                }, label: {
                    Text("Objects")
                        .bold()
                        .foregroundColor(.black)
                        .frame(width: 100,height: 30)
                        .background(Color.blue)
                        .cornerRadius(10)
                })
            }
        }
    }
    
    //MARK: Objects Editor
    var ObjectsEditor: some View{
            VStack {
                ColorPicker("Foreground Color", selection: $objectBackgroundColor)
                ColorPicker("Background Color", selection: $objectBackgroundColor)
                HStack{
                    Text("Size:")
                    Slider(
                        value: $sliderValue,
                        in: 1...10,
                        step: 0.5)
                    .accentColor(.red)
                }
                HStack{
                    Text("Corner Radius:")
                    Slider(
                        value: $objectCornerRadius,
                        in: 1...10,
                        step: 0.5)
                    .accentColor(.red)
                }
                HStack{
                    Text("Shadow:")
                    Slider(
                        value: $objectShadow,
                        in: 1...10,
                        step: 0.5)
                    .accentColor(.red)
                }

                HStack{
                    Text("Padding:")
                    Slider(
                        value: $objectPadding,
                        in: 1...10,
                        step: 0.5)
                    .accentColor(.red)
                }

                
                HStack{
                    switch objectTypeSelected {
                    case 1:
                    HStack{
                        Text("Font:")
                            .bold()
//                        Picker(
//                            selection: .constant(1),
//                            label:
//                                Text("Font"),
//                            content: {
//                                Text("headline").tag(1)
//                                Text("heavy").tag(2)
//                                Text("regular").tag(3)
//                            })
//                        Text("Bold:")
//                            .bold()
//                        Picker(
//                            selection: .constant(1),
//                            label:
//                                Text("Font"),
//                            content: {
//                                Text("true").tag(1)
//                                Text("false").tag(2)
//                            })
//                        Text("FontWeight:")
//                            .bold()
//                        Picker(
//                            selection: .constant(1),
//                            label:
//                                Text("regular"),
//                            content: {
//                                Text("heavy").tag(1)
//                                Text("light").tag(2)
//                            })
                    }
                    case 2:
                        HStack{
                            Text("test1")
                        }
                    case 3:
                        HStack{
                            Text("test2")
                        }
                    case 4:
                        HStack{
                            Text("test3")
                        }
                    default:
                        Text("Select an Object")
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical)
            .frame(maxWidth: .infinity,maxHeight: .infinity)
        
    }
    //MARK: ObjectsSection
    var ObjectsSection: some View{
        VStack{
            switch objectTypeSelected {
            case 1:
                ObjectsEditor
                Spacer()
                Text("Text")
                    .foregroundColor(objectForeGroundColor)
                    .font(objectFont)
                    .frame(width: objectSize[0], height: objectSize[1], alignment: objectAlignment)
                    .background(objectTypeSelected == 1 ? .clear:objectBackgroundColor)
                    .cornerRadius(objectCornerRadius)
                    .bold(objectBold)
                    .fontWeight(objectFontWeightt)
                    .shadow(radius: objectShadow)
                    .padding(objectPadding)
            case 2:
                ObjectsEditor
                Spacer()
                Text("Button")
                    .foregroundColor(objectForeGroundColor)
                    .font(objectFont)
                    .frame(width: objectSize[0], height: objectSize[1], alignment: objectAlignment)
                    .background(objectBackgroundColor)
                    .cornerRadius(objectTypeSelected == 2 ? 20.0:objectCornerRadius)
                    .bold(objectBold)
                    .fontWeight(objectFontWeightt)
                    .shadow(radius: objectShadow)
                    .padding(objectPadding)
            case 3:
                ObjectsEditor
                Spacer()
                Text("TextField")
                    .padding()
                    .frame(width: objectTypeSelected == 3 ? 200:objectSize[0])
                    .frame(height: objectSize[1])
                    .foregroundColor(objectForeGroundColor)
                    .background(objectTypeSelected == 3 ? .gray:objectBackgroundColor)
                    .cornerRadius(objectTypeSelected == 3 ? 10:objectCornerRadius)
                    .padding(objectTextFieldAlignment,objectPadding)
                    .shadow(radius: objectShadow)
            case 4:
                ObjectsEditor
                Spacer()
                Image(systemName: "gear")
                    .resizable()
                    .scaledToFit()
                    .foregroundColor(objectForeGroundColor)
                    .frame(width: objectTypeSelected == 4 ? 40.0:objectSize[0])
                    .padding(objectPadding)
            default:
                Text("Select Object")
            }
            Button(action: {}, label: {
                Text("submit")
                    .frame(width: 100, height: 50)
                    .foregroundColor(.blue)
                    .background(Color.black)
                    .cornerRadius(20)
                
            })
            .padding(.top,20)
            VStack{
            HStack{
                
                Button(action: {
                    objectTypeSelected = 1
                }, label: {
                    Text("Text")
                        .bold()
                        .font(.title3)
                        .foregroundColor(.black)
                        .frame(width: 150,height: 50)
                })
                
                Button(action: {
                    objectTypeSelected = 2
                }, label: {
                    Text("Button")
                        .bold()
                        .foregroundColor(.black)
                        .frame(width: 150,height: 50)
                        .background(Color.blue)
                        .cornerRadius(10)
                })
            }
            
            
            Button(action: {
                objectTypeSelected = 3
                
            }, label: {
                Text("TextField...")
                    .padding(.leading)
                    .bold()
                    .foregroundColor(.white)
                    .frame(width: 150,height: 50,alignment: .leading)
                    .background(Color.gray)
                    .cornerRadius(10)
            })
            
            VStack{
                Button(action: {
                    objectTypeSelected = 4
                }, label: {
                    Image(systemName: "questionmark.diamond.fill")
                        .resizable()
                        .scaledToFit()
                        .foregroundColor(.black)
                        .frame(width: 170,height: 60)
                        .cornerRadius(10)
                })
                Button(action: {
                    
                }, label: {
                    Text("icon")
                        .font(.caption)
                })
            }
        }
            .padding(.top)
        }
        .padding(.top,30)
    }
    
    //MARK: VariablesSection
    var VariablesSection: some View{
        HStack{
            Picker(
                selection: .constant(1),
                label:
                    Text("dataType"),
                content: {
                    Text("string").tag(1)
                    Text("int").tag(2)
                    Text("bool").tag(3)
                    Text("address").tag(4)
                    Text("bytes").tag(5)
                    Text("[]").tag(6)
                    
                })
            Spacer()
            Text("var_\(dataTypeVaraiable)")
                .padding()
                .background(Color.blue)
                .cornerRadius(20)
                
            TextField("var", text: $dataTypeVaraiable)
                .padding()
                .background(Color.gray)
                .cornerRadius(20)
                .padding(.horizontal,5)
            Image(systemName: "plus")
                .scaledToFit()
                .padding(.trailing,20)
        }
    }
    
    //MARK: FunctionsSection
    var FunctionsSection: some View{
        VStack {
            HStack{
                TextField("function()", text: $dataTypeVaraiable)
                    .padding()
                    .background(Color.gray)
                    .cornerRadius(20)
                    .padding(.horizontal,20)
                Image(systemName: "plus")
                    .padding(20)
                    .scaledToFit()
            }
            HStack {
                Text("Output Var")
                    .padding()
                    .foregroundColor(.white)
                    .background(Color.black)
                    .cornerRadius(20)
                Text("Input Var")
                    .padding()
                    .foregroundColor(.white)
                    .background(Color.black)
                    .cornerRadius(20)
            }
            
        }
        .background(Color.green)
        .cornerRadius(20)
        .padding(.horizontal)
    }

    
    //MARK: Settings Pallet
    var SettingsPallet: some View{
        ZStack{
            List{
                Section("DApplet"){
                    HStack{
                        Circle()
                            .frame(width: 30)
                        Text("SYMBOL")
                    }
                    HStack{
                        Text("{App} Version: ")
                        Spacer()
                        Text("0.0.0")
                            .font(.title3)
                            .bold()
                    }
                    
                    Text("This is the description of the Dapp provided")
                    
                    HStack(){
                        Text("Website:")
                        Text(" https\\:DAppletSite.com")
                            .font(.headline)
                            .foregroundColor(.blue)
                    }
                    
                    HStack{
                        Text("Network:")
                        Spacer()
                        Text("XDC")
                            .font(.title3)
                            .bold()
                    }
                    HStack{
                        VStack{
                            Text("Contract:")
                            Text("Explorer")
                                .font(.footnote)
                                .foregroundColor(.blue)
                        }
                        Spacer()
                        Text("xdce64996f74579ed41674a26216f8ecf980494dc38")
                            .font(.body)
                            .bold()
                    }
                    HStack{
                        Text("BackgroundColor:")
                    }
                }
                Section("Contract Interface"){
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("v1.0.0")
                            .bold()
                    }
                    Toggle("Show Grid", isOn: $grid.showGrid)
                    Toggle("Testnet", isOn: $grid.testnet)
                    }
                Section("3rd Party Verification "){
                    HStack {
                        Text("CoinClubLabs")
                        Spacer()
                        HStack {
                            Image(systemName: "checkmark.seal.fill")
                                .foregroundColor(.green)
                            Image(systemName: "info.circle")
                                .foregroundColor(.blue)
                        }
                    }
                }
            }
        }
    }
}

//"cimlVersion": "1.0.1",
//"appVersion": "0.0.1",
//"contractLanguage": "solidity ^0.8.10",
//"name": "LedgerContract",
//"symbol": "LC",
//"logo": "https\\:ipfs.address.url.jpeg",
//"thumbnail": "https\\:ipfs.address.url.jpeg",
//"description": "This is the description of the Dapp provided",
//"contractOrigin": "xdcerG45fCgvgh&%vhvctcr678BB",
