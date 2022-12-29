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
    
    @State var ObjectTypes:Int = 0 // toolbarstatus and object types
    @State var objectTitle:String = "Text"
    
    @State var objectTypeSelected=0
    @State var objectForeGroundColor: Color = .black
    @State var objectFont: Font = .headline
    @State var objectSize:[CGFloat] = [100,50]
    @State var objectAlignment:Alignment = .center
    
    @State var objectBackgroundColor:Color = .blue
    @State var objectCornerRadius:CGFloat = 0
    @State var objectBold:Bool = false
    @State var objectFontWeight:Font.Weight = .regular
    @State var objectShadow:CGFloat = 0
    @State var objectPadding:CGFloat = 5
    @State var objectTextFieldAlignment:Edge.Set = .all
    
//
    var body: some View {
        ZStack{
            backgroundColor
                .ignoresSafeArea(.all)
        VStack{
            CIMLFinalView(grid: grid)
            switch ObjectTypes {
            case 0:
                BuildTools(
                    showObjects: $showObjects,
                    showSettings: $showSettings,
                    toolbarStatus: $ObjectTypes,
                    objectTitle: $objectTitle,
                    grid: grid,
                    objectForeGroundColor: $objectForeGroundColor,
                    objectFont: $objectFont,
                    objectSize: $objectSize,
                    objectAlignment: $objectAlignment,
                    objectBackgroundColor: $objectBackgroundColor,
                    objectCornerRadius: $objectCornerRadius,
                    objectBold: $objectBold,
                    objectFontWeight: $objectFontWeight,
                    objectShadow: $objectShadow,
                    objectPadding: $objectPadding,
                    objectTextFieldAlignment: $objectTextFieldAlignment)
                .padding(.bottom)
                .padding(.top)
            case 1: // Text
                Text(objectTitle)
                    .foregroundColor(objectForeGroundColor)
                    .font(objectFont)
                    .frame(width: objectSize[0], height: objectSize[1], alignment: objectAlignment)
                    .background(objectTypeSelected == 1 ? .clear:objectBackgroundColor)
                    .cornerRadius(objectCornerRadius)
                    .bold(objectBold)
                    .fontWeight(objectFontWeight)
                    .shadow(radius: objectShadow)
                    .padding(objectPadding)
                    .onDrag{
                        NSItemProvider(object: "Text" as NSString)
                    }
                back
            case 2: // Button
                Text(objectTitle)
                    .foregroundColor(objectForeGroundColor)
                    .font(objectFont)
                    .frame(width: objectSize[0], height: objectSize[1], alignment: objectAlignment)
                    .background(objectBackgroundColor)
                    .cornerRadius(objectTypeSelected == 2 ? 20.0:objectCornerRadius)
                    .bold(objectBold)
                    .fontWeight(objectFontWeight)
                    .shadow(radius: objectShadow)
                    .padding(objectPadding)
                back
            case 3: // TextField
                Text(objectTitle)
                    .padding()
                    .frame(width: objectTypeSelected == 3 ? 200:objectSize[0])
                    .frame(height: objectSize[1])
                    .foregroundColor(objectForeGroundColor)
                    .background(objectTypeSelected == 3 ? .gray:objectBackgroundColor)
                    .cornerRadius(objectTypeSelected == 3 ? 10:objectCornerRadius)
                    .padding(objectTextFieldAlignment,objectPadding)
                    .shadow(radius: objectShadow)
                back
            case 4: // sysImage
                Image(systemName: objectTitle)
                    .resizable()
                    .scaledToFit()
                    .foregroundColor(objectForeGroundColor)
                    .frame(width: objectTypeSelected == 4 ? 40.0:objectSize[0])
                    .padding(objectPadding)
                back
            default:
                BuildTools(
                    showObjects: $showObjects,
                    showSettings: $showSettings,
                    toolbarStatus: $ObjectTypes,
                    objectTitle: $objectTitle,
                    grid: grid,
                    objectForeGroundColor: $objectForeGroundColor,
                    objectFont: $objectFont,
                    objectSize: $objectSize,
                    objectAlignment: $objectAlignment,
                    objectBackgroundColor: $objectBackgroundColor,
                    objectCornerRadius: $objectCornerRadius,
                    objectBold: $objectBold,
                    objectFontWeight: $objectFontWeight,
                    objectShadow: $objectShadow,
                    objectPadding: $objectPadding,
                    objectTextFieldAlignment: $objectTextFieldAlignment)
                .padding(.bottom)
                .padding(.top)
            }
            }
        .padding()
        }
    }
    var back: some View {
            Button(action: {
                ObjectTypes = 0
            }, label: {
                Image(systemName: "arrow.clockwise")
                    .foregroundColor(.black)
                    .frame(width: 30)
                    .scaledToFit()
                    .padding()
            })
    }
}

//MARK: BuildTools
struct BuildTools: View {
    @State var CIMLvariables: [Variable_Model] = [
        Variable_Model(varName: "var_name", type: "String", value: "This is data"),
        Variable_Model(varName: "var_int", type: "Int", value: "27")
    ]
    
    @Binding var showObjects:Bool
    @Binding var showSettings:Bool
    @Binding var toolbarStatus:Int
    @Binding var objectTitle:String
    @StateObject var grid:Grid
    @State private var showObjectView = 0
    @State var objectTypeSelected=0
    @State var objectSelected:Int = 0
    
    @State var dataTypeVaraiable:String = ""
    
    @Binding var objectForeGroundColor: Color
    @Binding var objectFont: Font
    @Binding var objectSize:[CGFloat]
    @Binding var objectAlignment:Alignment
    
    @Binding var objectBackgroundColor:Color
    @Binding var objectCornerRadius:CGFloat
    @Binding var objectBold:Bool
    @Binding var objectFontWeight:Font.Weight
    @Binding var objectShadow:CGFloat
    @Binding var objectPadding:CGFloat
    @Binding var objectTextFieldAlignment:Edge.Set
    
    @State var sliderValue:Double = 3
    
    
    
    var body: some View {
        
//        if(showObjects){
//            Spacer().animation(.easeIn)
//        }
        HStack{
            Button(action: {
                grid.clearCompiler()
            }, label: {
                Image(systemName: "trash")
                    .resizable()
                    .scaledToFit()
            })
            

            
            Spacer()
            
            Button(action: {
                test()
            }, label: {
                Image(systemName: "folder.fill.badge.plus")
                    .resizable()
                    .scaledToFit()
            })
            
            Spacer()
            
            Button(action: {
                showSettings.toggle()
            }, label: {
                Image(systemName: "info.circle")
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
                ZStack(alignment: .center){
                    TextField("\(objectTitle)", text: $objectTitle)
                        .padding()
                        .background(Color.gray)
                        .cornerRadius(50)
                }
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
                Text(objectTitle)
                    .foregroundColor(objectForeGroundColor)
                    .font(objectFont)
                    .frame(width: objectSize[0], height: objectSize[1], alignment: objectAlignment)
                    .background(objectTypeSelected == 1 ? .clear:objectBackgroundColor)
                    .cornerRadius(objectCornerRadius)
                    .bold(objectBold)
                    .fontWeight(objectFontWeight)
                    .shadow(radius: objectShadow)
                    .padding(objectPadding)
            case 2:
                ObjectsEditor
                Spacer()
                Text(objectTitle)
                    .foregroundColor(objectForeGroundColor)
                    .font(objectFont)
                    .frame(width: objectSize[0], height: objectSize[1], alignment: objectAlignment)
                    .background(objectBackgroundColor)
                    .cornerRadius(objectTypeSelected == 2 ? 20.0:objectCornerRadius)
                    .bold(objectBold)
                    .fontWeight(objectFontWeight)
                    .shadow(radius: objectShadow)
                    .padding(objectPadding)
            case 3:
                ObjectsEditor
                Spacer()
                Text(objectTitle)
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
                Image(systemName: objectTitle)
                    .resizable()
                    .scaledToFit()
                    .foregroundColor(objectForeGroundColor)
                    .frame(width: objectTypeSelected == 4 ? 40.0:objectSize[0])
                    .padding(objectPadding)
            default:
                Text("Select Object")
            }
            Button(action: {
                toolbarStatus = objectSelected
            }, label: {
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
                    objectSelected = objectTypeSelected
                    objectTitle = "Text"
                }, label: {
                    Text("Text")
                        .bold()
                        .font(.title3)
                        .foregroundColor(.black)
                        .frame(width: 150,height: 50)
                })
                
                Button(action: {
                    objectTypeSelected = 2
                    objectSelected = objectTypeSelected
                    objectTitle = "Button"
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
                objectSelected = objectTypeSelected
                objectTitle = "TextField"
                
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
                    objectSelected = objectTypeSelected
                    objectTitle = "questionmark.diamond.fill"
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
        VStack{
            List{
                Section("Variables"){
                    ForEach(CIMLvariables, id: \.id){ variables in
                        HStack{
                            Text(variables.type)
                                .font(.subheadline)
                                .bold()
                                .frame(maxWidth: .infinity)
                                .foregroundColor(.white)
                                .background(Color.black)
                                .cornerRadius(20)
                            Text(variables.varName)
                                .font(.subheadline)
                                .bold()
                                .frame(maxWidth: .infinity)
                                .background(Color.blue)
                                .cornerRadius(20)
                            Text(variables.value)
                                .bold()
                                .font(.subheadline)
                                .frame(maxWidth: .infinity)
                                .background(Color.green)
                                .cornerRadius(20)
                        }
                    }
                        .onDelete(perform: {IndexSet in
                            deleteVariable(indexSet: IndexSet)
                        })
                }
            }
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
                        
                    }).pickerStyle(.menu)
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
            .padding()
        }
        .background(Color.green)
        .cornerRadius(20)
        .padding(.horizontal)
    }
    
    //MARK: FunctionsSection
    var FunctionsSection: some View{
        VStack {
            
            HStack{
                TextField("function()", text: $dataTypeVaraiable)
                    .padding()
                    .background(Color.gray)
                    .cornerRadius(20)
                    .padding(20)
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
                    .padding(.bottom)
                Text("Input Var")
                    .padding()
                    .foregroundColor(.white)
                    .background(Color.black)
                    .cornerRadius(20)
                    .padding(.bottom)
            }
            
        }
        .background(Color.green)
        .cornerRadius(20)
        .padding(.horizontal)
    }
    
    //MARK: Settings Pallet
    var SettingsPallet: some View{
        VStack{
            List{
                Section("DApplet"){
                    Image("XTB")
                        .resizable()
                        .scaledToFit()
                    HStack{
                        Circle()
                            .frame(width: 30)
                        
                        Text("Name")
                        Text("-")
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
                }
            }
            .listStyle(.grouped)
            Button(action: {}, label: {
                Text("Edit")
                    .cornerRadius(20)
                    .frame(maxWidth: .infinity)
                    .foregroundColor(.black)
                    .padding()
            })
            .background(Color.green)
        }
    }
    func deleteVariable(indexSet: IndexSet){
        CIMLvariables.remove(atOffsets: indexSet)
    }
    
    func test(){
        grid.TextList.append(CIMLText(text: "Exit",font: .title, frame: [100,50], location: 119))
        grid.TextList.append(CIMLText(text: String("This is a header"),font: .largeTitle,frame: [300,50], location: 5))
        grid.TextFieldList.append(CIMLTextField(text: "enter text",textField: "",foreGroundColor: .black, location: 32))
        grid.SysImageList.append(CIMLSYSImage(name: "clipboard",padding: 0, location: 90))
        grid.ButtonList.append(CIMLButton(text: "gear",isIcon: true,font: .title, location: 1))
        
        
        print("total CLASS TextList: ",grid.TextList.count)
        print("total CLASS TextField: ",grid.TextFieldList.count)
        print("total CLASS  SysImageList: ",grid.SysImageList.count)
        print("total CLASS ButtonList: ",grid.ButtonList.count)
    }
    
}


