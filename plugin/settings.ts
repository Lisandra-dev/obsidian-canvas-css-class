import {App, Notice, PluginSettingTab, Setting} from "obsidian";
import CanvasCSS from "./main";
import {AddCssClass, AddNewClassWithFile} from "./modals/addClass";
import {EditBehavior, RenameCanvasPath, RenameCssClass} from "./modals/editClass";
import {t} from "./i18n";
import {addCanvasPathAndCanvasFile, addToDOM, reloadCanvas, removeFromDOM} from "./utils";

export class CanvasCssSettingsTabs extends PluginSettingTab {
	plugin: CanvasCSS;

	constructor(app: App, plugin: CanvasCSS) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl("h1", {text: t("settings.title") as string});
		
		if (this.plugin.settings.canvasAdded.length=== 0) {
			containerEl.createEl("p", {text: t("settings.noClassAdded") as string});
			containerEl.createEl("p", {text: t("settings.useCommandsInfo") as string});
		}
		
		new Setting(containerEl)
			.setName(t("settings.console.title") as string)
			.setDesc(t("settings.console.desc") as string)
			.addDropdown((dropdown) => {
				dropdown
					.addOption("none", t("settings.console.options.none") as string)
					.addOption("error", t("settings.console.options.error") as string)
					.addOption("warn", t("settings.console.options.warn") as string)
					.addOption("log", t("settings.console.options.log") as string)
					.addOption("notice", t("settings.console.options.notice") as string)
					.setValue(this.plugin.settings.logLevel)
					.onChange(async (value) => {
						this.plugin.settings.logLevel = value;
						await this.plugin.saveSettings();
					});
			});
		const logLevel = this.plugin.settings.logLevel;
		
		new Setting(containerEl)
			.setDesc(t("settings.newCanvas.addingInfo") as string)
			.addButton(cb => cb
				.setButtonText(t("settings.newCanvas.addNewCanvas") as string)
				.onClick(async () => {
					new AddNewClassWithFile(this.app, async (path:string, cssClass: string, appendBehavior:string) => {
						if (this.plugin.settings.canvasAdded.find(c => c.canvasPath === path)) {
							// add class to existing only if it doesn't exist
							if (!this.plugin.settings.canvasAdded.find(c => c.canvasPath === path)?.canvasClass?.includes(cssClass)) {
								this.plugin.settings.canvasAdded.find(c => c.canvasPath === path)?.canvasClass?.push(cssClass);
							} else {
								new Notice(t("settings.alreadyApplied") as string);
							}
						} else {
							this.plugin.settings.canvasAdded.push({canvasPath: path, canvasClass: [cssClass], appendBehavior: appendBehavior});
						}
						await this.plugin.saveSettings();
						this.display();
						addToDOM(cssClass, path, appendBehavior, logLevel);
					}).open();
				}));
		
		for (const canvas of this.plugin.settings.canvasAdded) {
			new Setting(containerEl)
				.setName(canvas.canvasPath.replace(".canvas", ""))
				.setClass("canvas-css-class-title")
				.addExtraButton(cb =>
					cb
						.setIcon("plus")
						.setTooltip(t("settings.newClass.addingInfo") as string)
						.onClick(async () => {
							new AddCssClass(this.app, async (cssClass: string) =>
							{
								if (canvas.canvasClass.indexOf(cssClass) === -1) {
									canvas.canvasClass.push(cssClass);
									await this.plugin.saveSettings();
									this.display();
									addToDOM(cssClass, canvas.canvasPath, canvas.appendBehavior, logLevel);
								} else {
									new Notice(t("settings.alreadyApplied") as string);
								}
							}).open();
						}))
				.addExtraButton(cb =>
					cb
						.setIcon("edit")
						.setTooltip(t("settings.edit.filepath") as string)
						.onClick(async () => {
							new RenameCanvasPath(this.app, canvas.canvasPath.replace(".canvas", ""), async (newPath: string) => {
								canvas.canvasPath = newPath.replace(".canvas", "") + ".canvas";
								await this.plugin.saveSettings();
								this.display();
							}).open();
						}))
				.addExtraButton(cb =>
					cb
						.setIcon("pane-layout")
						.setTooltip(t("settings.appendBehavior.edit") as string)
						.onClick(async () => {
							new EditBehavior(this.app, canvas.appendBehavior, async (newAppendBehavior: string) => {
								canvas.appendBehavior = newAppendBehavior;
								await this.plugin.saveSettings();
								this.display();
								addCanvasPathAndCanvasFile(canvas.appendBehavior, canvas.canvasPath);
								reloadCanvas(canvas.canvasPath, canvas.appendBehavior, this.plugin.settings);
							}).open();
						})
				)
				
				.addExtraButton(cb =>
					cb
						.setIcon("trash")
						.setTooltip(t("settings.remove.desc") as string)
						.onClick(async () => {
							const oldCanvas = this.plugin.settings.canvasAdded.find(c => c.canvasPath === canvas.canvasPath);
							this.plugin.settings.canvasAdded = this.plugin.settings.canvasAdded.filter((item) => item.canvasPath !== canvas.canvasPath);
							await this.plugin.saveSettings();
							for (const cssClass of oldCanvas?.canvasClass ?? []) {
								removeFromDOM(cssClass, logLevel);
							}
							this.display();
						}));
			for (const cssClass of canvas.canvasClass) {
				new Setting(containerEl)
					.setName(cssClass)
					.setClass("canvas-css-class-opt")
					.addExtraButton(cb =>
						cb.setIcon("edit")
							.setTooltip(t("settings.edit.class") as string)
							.onClick(async () => {
								new RenameCssClass(this.app, cssClass, async (newClass: string) =>
								{
									const index = canvas.canvasClass.indexOf(cssClass);
									if (index > -1) {
										canvas.canvasClass[index] = newClass;
									}
									await this.plugin.saveSettings();
									this.display();
									addCanvasPathAndCanvasFile(canvas.appendBehavior, canvas.canvasPath);
									reloadCanvas(canvas.canvasPath, canvas.appendBehavior, this.plugin.settings);
								}).open();
							})
					)
					.addExtraButton(cb =>
						cb.setIcon("cross")
							.setTooltip(t("settings.remove.title") as string)
							.onClick(async () => {
								//remove class from the array
								const index = canvas.canvasClass.indexOf(cssClass);
								if (index > -1) {
									canvas.canvasClass.splice(index, 1);
								}
								//remove canvas from the array if no classes are left
								if (canvas.canvasClass.length === 0) {
									const index = this.plugin.settings.canvasAdded.indexOf(canvas);
									if (index > -1) {
										this.plugin.settings.canvasAdded.splice(index, 1);
									}
								}
								await this.plugin.saveSettings();
								this.display();
								removeFromDOM(cssClass, logLevel);
							})
					);
			}
		}
	}
}
