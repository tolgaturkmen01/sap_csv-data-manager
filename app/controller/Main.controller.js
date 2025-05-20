sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], function (Controller, UIComponent, JSONModel, MessageBox) {
    "use strict";

    return Controller.extend("csv.data.manager.controller.Main", {
        onInit: function () {
            this.getView().setModel(new JSONModel({
                Person: []
            }));
        },

        onFileChange: function (oEvent) {
            const file = oEvent.getParameter("files")[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const csvData = e.target.result;
                this.processCSVData(csvData);
            };
            reader.readAsText(file);
        },

        processCSVData: function (csvData) {
            const lines = csvData.split("\n");
            const headers = lines[0].split(",");
            const data = [];

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;

                const values = lines[i].split(",");
                const record = {};
                
                headers.forEach((header, index) => {
                    const value = values[index].trim();
                    if (header === "birthDate") {
                        record[header] = new Date(value);
                        record.age = this.calculateAge(new Date(value));
                    } else if (header === "ID") {
                        record[header] = parseInt(value);
                    } else {
                        record[header] = value;
                    }
                });

                data.push(record);
            }

            this.getView().getModel().setProperty("/Person", data);
        },

        calculateAge: function (birthDate) {
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            return age;
        },

        onSave: function () {
            const data = this.getView().getModel().getProperty("/Person");
            
            // Call the CAP service to save data
            const oModel = this.getView().getModel();
            oModel.callFunction("/saveData", {
                method: "POST",
                urlParameters: {
                    data: JSON.stringify(data)
                },
                success: function () {
                    MessageBox.success("Data saved successfully!");
                },
                error: function () {
                    MessageBox.error("Error saving data!");
                }
            });
        },

        onCancel: function () {
            // Call the CAP service to cancel changes
            const oModel = this.getView().getModel();
            oModel.callFunction("/cancelChanges", {
                method: "POST",
                success: function () {
                    this.getView().getModel().setProperty("/Person", []);
                    MessageBox.success("Changes cancelled!");
                }.bind(this),
                error: function () {
                    MessageBox.error("Error cancelling changes!");
                }
            });
        }
    });
}); 